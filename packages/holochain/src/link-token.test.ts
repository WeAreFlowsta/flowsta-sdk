import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppAmbiguousError,
  authenticateWithVault,
  backupToVault,
  clearBoundIdentity,
  clearVaultLinkToken,
  getAppSecret,
  getFlowstaLinkStatus,
  getVaultLinkToken,
  getVaultStatus,
  linkFlowstaIdentity,
  LinkTokenError,
  listVaultBackups,
  OriginNotRegisteredError,
  retrieveFromVault,
  revokeFlowstaIdentity,
  selectVaultLink,
  setVaultLinkToken,
  signDocument,
  VaultRequestRefusedError,
} from './index';

// ── helpers ────────────────────────────────────────────────────────

const IPC = 'http://127.0.0.1:27777';
const VAULT_KEY = 'uhCAkVaultVaultVaultVaultVaultVaultVaultVaultVaultVau';
const AGENT = 'uhCAkInstallKeyOneOneOneOneOneOneOneOneOneOneOneOneOne';
const AGENT_2 = 'uhCAkInstallKeyTwoTwoTwoTwoTwoTwoTwoTwoTwoTwoTwoTwoTwo';
const TOKEN = 'tok-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

type Seen = { url: string; method: string; body: Record<string, unknown> | null };
type Route = (seen: Seen) => Response | null;

/** Mock `fetch`; every request is recorded with its parsed JSON body. */
function mockVault(route: Route): Seen[] {
  const calls: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const seen: Seen = {
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
      };
      calls.push(seen);
      const r = route(seen);
      if (!r) throw new TypeError('fetch failed');
      return r;
    }),
  );
  return calls;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const path = (seen: Seen) => new URL(seen.url).pathname;
const query = (seen: Seen) => new URL(seen.url).searchParams;
const unlocked = () => json(200, { unlocked: true, initialized: true, agent_pub_key: VAULT_KEY });

/** A Vault that links and issues `token` (or none, like an older Vault). */
function linkingVault(token: string | null, rest: Route = () => null): Route {
  return (seen) => {
    if (path(seen) === '/status') return unlocked();
    if (path(seen) === '/link-identity') {
      return json(200, {
        vault_agent_pub_key: VAULT_KEY,
        vault_signature: 'c2ln',
        ...(token ? { link_token: token } : {}),
      });
    }
    return rest(seen);
  };
}

/** Each test links under its own client id: the module keeps links for the whole file. */
let n = 0;
let CLIENT = '';
beforeEach(() => {
  n += 1;
  CLIENT = `flowsta_app_test${n}`;
  clearBoundIdentity();
});
afterEach(() => {
  vi.unstubAllGlobals();
  clearBoundIdentity();
});

async function link(token: string | null, rest?: Route, agent = AGENT) {
  const calls = mockVault(linkingVault(token, rest));
  const result = await linkFlowstaIdentity({ appName: 'T', clientId: CLIENT, localAgentPubKey: agent, ipcUrl: IPC });
  return { calls, result };
}

// ── linking ────────────────────────────────────────────────────────

describe('linkFlowstaIdentity and the link token', () => {
  it('asks for a token-bound link, stores the token it is given and returns it', async () => {
    const { calls, result } = await link(TOKEN);
    const sent = calls.find((c) => path(c) === '/link-identity')!;
    expect(sent.body).toMatchObject({ client_id: CLIENT, app_agent_pub_key: AGENT, require_link_token: true });
    expect(sent.body).not.toHaveProperty('link_token');
    expect(result.linkToken).toBe(TOKEN);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe(TOKEN);
    expect(getVaultLinkToken(CLIENT)).toBe(TOKEN);
  });

  it('keeps one token per app and per install key', async () => {
    await link('token-one', undefined, AGENT);
    await link('token-two', undefined, AGENT_2);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe('token-one');
    expect(getVaultLinkToken(CLIENT, AGENT_2)).toBe('token-two');
    // Without a key: the one linked last, until the app selects another.
    expect(getVaultLinkToken(CLIENT)).toBe('token-two');
    selectVaultLink(CLIENT, AGENT);
    expect(getVaultLinkToken(CLIENT)).toBe('token-one');
    expect(getVaultLinkToken('flowsta_app_other', AGENT)).toBeNull();
  });

  it('linking again replaces the token', async () => {
    await link('token-old');
    await link('token-new');
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe('token-new');
  });

  it('an older Vault (no token in the answer) works unchanged', async () => {
    const { result, calls } = await link(null, (seen) => {
      if (path(seen) === '/backup') return json(200, { label: 'latest', data_size: 2, created_at: 1 });
      if (path(seen) === '/link-status') return json(200, { linked: true, app_name: 'T' });
      return null;
    });
    expect(result).toEqual({ success: true, payload: { vaultAgentPubKey: VAULT_KEY, vaultSignature: 'c2ln' } });
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();

    await backupToVault({ clientId: CLIENT, appName: 'T', ipcUrl: IPC }, { a: 1 });
    const backup = calls.find((c) => path(c) === '/backup')!;
    expect(backup.body).not.toHaveProperty('link_token');
    expect(backup.body!.client_id).toBe(CLIENT);

    expect(await getFlowstaLinkStatus({ clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC })).toEqual({
      state: 'linked',
      appName: 'T',
    });
    expect(query(calls.find((c) => path(c) === '/link-status')!).has('link_token')).toBe(false);
  });

  it('an older Vault after a newer one: the ended token is not kept', async () => {
    await link('token-old');
    await link(null);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('origin_not_registered is a typed error', async () => {
    mockVault((seen) =>
      path(seen) === '/status' ? unlocked() : json(403, { error: 'origin_not_registered', description: 'not on the list' }),
    );
    const err = await linkFlowstaIdentity({ appName: 'T', clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(OriginNotRegisteredError);
    expect(err.code).toBe('origin_not_registered');
    expect(err.message).toBe('not on the list');
  });
});

// ── the helpers and where the token is kept ────────────────────────

describe('link token helpers', () => {
  it('set, get and clear, for an app that keeps the token elsewhere', () => {
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
    setVaultLinkToken(CLIENT, AGENT, TOKEN);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe(TOKEN);
    clearVaultLinkToken(CLIENT, AGENT);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
    setVaultLinkToken(CLIENT, AGENT, TOKEN);
    clearVaultLinkToken(CLIENT);
    expect(getVaultLinkToken(CLIENT)).toBeNull();
  });

  it('is kept in localStorage under a key per app and per install key', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    setVaultLinkToken(CLIENT, AGENT, TOKEN);
    expect(store.get(`flowsta:vault-link-token:${CLIENT}:${AGENT}`)).toBe(TOKEN);
    clearVaultLinkToken(CLIENT, AGENT);
    expect(store.has(`flowsta:vault-link-token:${CLIENT}:${AGENT}`)).toBe(false);
  });

  it('works where storage refuses every access', () => {
    const refuse = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: refuse, setItem: refuse, removeItem: refuse });
    setVaultLinkToken(CLIENT, AGENT, TOKEN);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe(TOKEN);
    clearVaultLinkToken(CLIENT, AGENT);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });
});

// ── the token on later calls ───────────────────────────────────────

describe('the token and client_id on Vault calls', () => {
  it('POST calls carry link_token and client_id in the body', async () => {
    const { calls } = await link(TOKEN, (seen) => {
      if (path(seen) === '/backup') return json(200, { label: 'latest', data_size: 2, created_at: 1 });
      if (path(seen) === '/backup/retrieve') return json(404, { error: 'backup_not_found' });
      if (path(seen) === '/app-secret') return json(200, { secret_hex: 'ab'.repeat(32), label: 'network' });
      if (path(seen) === '/sign-document') {
        return json(200, { file_hash: 'f', signature: 's', agent_pub_key: VAULT_KEY, signed_at: 't', action_hash: 'h' });
      }
      if (path(seen) === '/authenticate') return json(200, { signature: 'c2ln', agent_pub_key: VAULT_KEY, did: 'd' });
      return null;
    });

    await backupToVault({ clientId: CLIENT, appName: 'T', ipcUrl: IPC }, { a: 1 });
    await retrieveFromVault({ clientId: CLIENT, ipcUrl: IPC });
    await getAppSecret({ label: 'network', ipcUrl: IPC });
    await signDocument({ clientId: CLIENT, appName: 'T', fileHash: 'f', ipcUrl: IPC });
    await authenticateWithVault('nonce', { clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC });

    for (const route of ['/backup', '/backup/retrieve', '/app-secret', '/sign-document', '/authenticate']) {
      const sent = calls.find((c) => path(c) === route)!;
      expect(sent.method, route).toBe('POST');
      expect(sent.body, route).toMatchObject({ client_id: CLIENT, link_token: TOKEN });
      expect(new URL(sent.url).search, route).toBe('');
    }
  });

  it('GET calls carry link_token and client_id in the query string', async () => {
    const { calls } = await link(TOKEN, (seen) => {
      if (path(seen) === '/link-status') return json(200, { linked: true });
      if (path(seen) === '/backup/list') return json(200, { app_count: 0, total_backups: 0, total_size: 0, apps: [] });
      return null;
    });

    await getFlowstaLinkStatus({ clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC });
    await listVaultBackups(IPC);
    await getVaultStatus(IPC, { clientId: CLIENT });

    const status = calls[calls.length - 1];
    for (const sent of [
      calls.find((c) => path(c) === '/link-status')!,
      calls.find((c) => path(c) === '/backup/list')!,
      status,
    ]) {
      expect(sent.method).toBe('GET');
      expect(sent.body).toBeNull();
      expect(query(sent).getAll('client_id')).toEqual([CLIENT]);
      expect(query(sent).getAll('link_token')).toEqual([TOKEN]);
    }
    expect(path(status)).toBe('/status');
    expect(query(calls.find((c) => path(c) === '/backup/list')!).get('expected_identity')).toBe(VAULT_KEY);
  });

  it('a plain getVaultStatus() sends nothing new', async () => {
    const { calls } = await link(TOKEN);
    await getVaultStatus(IPC);
    expect(calls[calls.length - 1].url).toBe(`${IPC}/status`);
  });

  it('a call given an install key presents that key\'s token', async () => {
    await link('token-one', undefined, AGENT);
    const { calls } = await link(
      'token-two',
      (seen) => (path(seen) === '/backup/retrieve' ? json(404, {}) : null),
      AGENT_2,
    );
    await retrieveFromVault({ clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC });
    await retrieveFromVault({ clientId: CLIENT, ipcUrl: IPC });
    const sent = calls.filter((c) => path(c) === '/backup/retrieve').map((c) => c.body!.link_token);
    expect(sent).toEqual(['token-one', 'token-two']);
  });

  it('signing in for a companion client presents the linked app\'s token', async () => {
    const { calls } = await link(TOKEN, (seen) =>
      path(seen) === '/authenticate' ? json(200, { signature: 'c2ln', agent_pub_key: VAULT_KEY, did: 'd' }) : null,
    );
    await authenticateWithVault('nonce', { clientId: 'flowsta_app_web_companion', localAgentPubKey: AGENT, ipcUrl: IPC });
    expect(calls.find((c) => path(c) === '/authenticate')!.body).toMatchObject({
      client_id: 'flowsta_app_web_companion',
      link_token: TOKEN,
    });
  });
});

// ── refusals ───────────────────────────────────────────────────────

describe('refusals', () => {
  it('invalid_link_token is a LinkTokenError and clears the stored token', async () => {
    await link(TOKEN, (seen) =>
      path(seen) === '/backup/retrieve' ? json(403, { error: 'invalid_link_token', description: 'no such link' }) : null,
    );
    const err = await retrieveFromVault({ clientId: CLIENT, ipcUrl: IPC }).catch((e) => e);
    expect(err).toBeInstanceOf(LinkTokenError);
    expect(err.code).toBe('invalid_link_token');
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('invalid_link_token on a write: the error reaches the caller and the token is cleared', async () => {
    await link(TOKEN, (seen) => (path(seen) === '/backup' ? json(403, { error: 'invalid_link_token' }) : null));
    await expect(backupToVault({ clientId: CLIENT, appName: 'T', ipcUrl: IPC }, { a: 1 })).rejects.toBeInstanceOf(
      LinkTokenError,
    );
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('link_token_required is a LinkTokenError and leaves storage alone', async () => {
    await link(TOKEN, (seen) => (path(seen) === '/sign-document' ? json(403, { error: 'link_token_required' }) : null));
    const err = await signDocument({ clientId: CLIENT, appName: 'T', fileHash: 'f', ipcUrl: IPC }).catch((e) => e);
    expect(err).toBeInstanceOf(LinkTokenError);
    expect(err.code).toBe('link_token_required');
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe(TOKEN);
  });

  it('getFlowstaLinkStatus reads a refused token as unlinked, and clears an invalid one', async () => {
    await link(TOKEN, (seen) => (path(seen) === '/link-status' ? json(403, { error: 'invalid_link_token' }) : null));
    expect(await getFlowstaLinkStatus({ clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC })).toEqual({
      state: 'unlinked',
    });
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('getVaultStatus asks again without a refused token instead of reporting no Vault', async () => {
    const { calls } = await link(TOKEN, () => null);
    mockVault((seen) => {
      calls.push(seen);
      return query(seen).has('link_token') ? json(403, { error: 'invalid_link_token' }) : unlocked();
    });
    const status = await getVaultStatus(IPC, { clientId: CLIENT });
    expect(status.running).toBe(true);
    expect(status.unlocked).toBe(true);
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('app_ambiguous, not_addressed_here and origin_required are typed errors', async () => {
    const answer = { error: 'app_ambiguous' };
    mockVault((seen) => (path(seen) === '/status' ? unlocked() : json(403, answer)));

    expect(await retrieveFromVault({ clientId: CLIENT, ipcUrl: IPC }).catch((e) => e)).toBeInstanceOf(AppAmbiguousError);

    answer.error = 'not_addressed_here';
    const notHere = await getAppSecret({ label: 'x', ipcUrl: IPC }).catch((e) => e);
    expect(notHere).toBeInstanceOf(VaultRequestRefusedError);
    expect(notHere.code).toBe('not_addressed_here');

    answer.error = 'origin_required';
    const noOrigin = await authenticateWithVault('nonce', { ipcUrl: IPC }).catch((e) => e);
    expect(noOrigin).toBeInstanceOf(VaultRequestRefusedError);
    expect(noOrigin.code).toBe('origin_required');
  });
});

// ── unlink ─────────────────────────────────────────────────────────

describe('revokeFlowstaIdentity', () => {
  const revoke = () => revokeFlowstaIdentity({ appName: 'T', clientId: CLIENT, localAgentPubKey: AGENT, ipcUrl: IPC });

  it('a Vault that reports removed: sends the token, returns what happened, forgets the token', async () => {
    const { calls } = await link(TOKEN, (seen) =>
      path(seen) === '/revoke-identity' ? json(200, { success: true, removed: true }) : null,
    );
    expect(await revoke()).toEqual({ reachable: true, removed: true, success: true });
    expect(calls.find((c) => path(c) === '/revoke-identity')!.body).toEqual({
      app_name: 'T',
      app_agent_pub_key: AGENT,
      client_id: CLIENT,
      link_token: TOKEN,
    });
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('a Vault that removed nothing: reachable, not removed, token kept', async () => {
    await link(TOKEN, (seen) => (path(seen) === '/revoke-identity' ? json(200, { success: true, removed: false }) : null));
    expect(await revoke()).toEqual({ reachable: true, removed: false, success: false });
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe(TOKEN);
  });

  it('an older Vault ({ success: true }): removed follows success', async () => {
    const { calls } = await link(null, (seen) => (path(seen) === '/revoke-identity' ? json(200, { success: true }) : null));
    expect(await revoke()).toEqual({ reachable: true, removed: true, success: true });
    expect(calls.find((c) => path(c) === '/revoke-identity')!.body).not.toHaveProperty('link_token');
  });

  it('no Vault: not reachable, not removed, never throws', async () => {
    setVaultLinkToken(CLIENT, AGENT, TOKEN);
    mockVault(() => null);
    expect(await revoke()).toEqual({ reachable: false, removed: false, success: false });
    expect(getVaultLinkToken(CLIENT, AGENT)).toBe(TOKEN);
  });

  it('a Vault that refuses: reachable, not removed; an invalid token is forgotten', async () => {
    await link(TOKEN, (seen) => (path(seen) === '/revoke-identity' ? json(403, { error: 'invalid_link_token' }) : null));
    expect(await revoke()).toEqual({ reachable: true, removed: false, success: false });
    expect(getVaultLinkToken(CLIENT, AGENT)).toBeNull();
  });

  it('still callable without a client id, as before 3.11.0', async () => {
    const { calls } = await link(TOKEN, (seen) =>
      path(seen) === '/revoke-identity' ? json(200, { success: true, removed: true }) : null,
    );
    const result = await revokeFlowstaIdentity({ appName: 'T', localAgentPubKey: AGENT, ipcUrl: IPC });
    expect(result.success).toBe(true);
    expect(calls.find((c) => path(c) === '/revoke-identity')!.body).toMatchObject({ link_token: TOKEN });
  });

  it('waits up to 10 seconds for the answer', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init?: RequestInit) =>
            new Promise<Response>((resolve, reject) => {
              init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
              setTimeout(() => resolve(json(200, { success: true, removed: true })), 8000);
            }),
        ),
      );
      const pending = revoke();
      await vi.advanceTimersByTimeAsync(8000);
      expect(await pending).toMatchObject({ reachable: true, removed: true });

      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
            }),
        ),
      );
      const never = revoke();
      await vi.advanceTimersByTimeAsync(10000);
      expect(await never).toEqual({ reachable: false, removed: false, success: false });
    } finally {
      vi.useRealTimers();
    }
  });
});
