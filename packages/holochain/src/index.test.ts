import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  agentKeysMatch,
  authenticateWithVault,
  backupToVault,
  getVaultStatus,
  loopbackPermissionState,
  VaultBlockedError,
  bindVaultIdentity,
  clearBoundIdentity,
  EmptyBackupSkippedError,
  FlowstaHolochainError,
  getBoundIdentity,
  IdentityMismatchError,
  onIdentityChanged,
  retrieveFromVault,
  VaultLockedError,
  VaultNotFoundError,
} from './index';

// ── helpers ────────────────────────────────────────────────────────

// A plausible agent key: 39 bytes starting 0x84 0x20 0x24.
function makeKeyBytes(fill: number): Uint8Array {
  const b = new Uint8Array(39);
  b[0] = 0x84;
  b[1] = 0x20;
  b[2] = 0x24;
  for (let i = 3; i < 39; i++) b[i] = fill;
  return b;
}

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'u' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return 'u' + out;
}

const KEY_A = makeKeyBytes(7);
const KEY_B = makeKeyBytes(9);
const IPC = 'http://127.0.0.1:27777';

type Route = (url: string, init?: RequestInit) => Response | Promise<Response> | null;

function mockFetch(route: Route) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const r = await route(String(url), init);
      if (!r) throw new TypeError('fetch failed');
      return r;
    }),
  );
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => clearBoundIdentity());
afterEach(() => {
  vi.unstubAllGlobals();
  clearBoundIdentity();
});

// ── agentKeysMatch ─────────────────────────────────────────────────

describe('agentKeysMatch', () => {
  it('matches the same key across base64url and base58 encodings', () => {
    expect(agentKeysMatch(b64url(KEY_A), b58(KEY_A))).toBe(true);
  });

  it('definitely rejects two different keys', () => {
    expect(agentKeysMatch(b64url(KEY_A), b64url(KEY_B))).toBe(false);
    expect(agentKeysMatch(b64url(KEY_A), b58(KEY_B))).toBe(false);
  });

  it('abstains (null) when a key cannot be decoded', () => {
    expect(agentKeysMatch('not-a-key', b64url(KEY_A))).toBe(null);
    expect(agentKeysMatch('u@@@@', b64url(KEY_A))).toBe(null);
  });

  it('identical strings match without decoding', () => {
    expect(agentKeysMatch('whatever', 'whatever')).toBe(true);
  });
});

// ── binding ────────────────────────────────────────────────────────

describe('identity binding', () => {
  it('binds, reads back, clears', () => {
    expect(getBoundIdentity()).toBe(null);
    bindVaultIdentity(b64url(KEY_A));
    expect(getBoundIdentity()).toBe(b64url(KEY_A));
    clearBoundIdentity();
    expect(getBoundIdentity()).toBe(null);
  });
});

// ── retrieveFromVault taxonomy ─────────────────────────────────────

describe('retrieveFromVault', () => {
  it('confirmed 404 returns null (the only null)', async () => {
    mockFetch(() => json(404, { error: 'backup_not_found' }));
    await expect(retrieveFromVault({ clientId: 'c', ipcUrl: IPC })).resolves.toBe(null);
  });

  it('409 identity_mismatch throws IdentityMismatchError', async () => {
    mockFetch(() => json(409, { error: 'identity_mismatch', description: 'x' }));
    await expect(retrieveFromVault({ clientId: 'c', ipcUrl: IPC })).rejects.toBeInstanceOf(
      IdentityMismatchError,
    );
  });

  it('locked vault throws VaultLockedError', async () => {
    mockFetch(() => json(403, { error: 'vault_never_unlocked' }));
    await expect(retrieveFromVault({ clientId: 'c', ipcUrl: IPC })).rejects.toBeInstanceOf(
      VaultLockedError,
    );
  });

  it('unreadable slot (500) throws instead of reading as absent', async () => {
    mockFetch(() => json(500, { error: 'backup_unreadable' }));
    await expect(retrieveFromVault({ clientId: 'c', ipcUrl: IPC })).rejects.toBeInstanceOf(
      FlowstaHolochainError,
    );
  });

  it('unreachable vault throws VaultNotFoundError instead of null', async () => {
    mockFetch(() => null);
    await expect(retrieveFromVault({ clientId: 'c', ipcUrl: IPC })).rejects.toBeInstanceOf(
      VaultNotFoundError,
    );
  });

  it('sends expected_identity when bound', async () => {
    bindVaultIdentity(b64url(KEY_A));
    let sentBody = '';
    mockFetch((url, init) => {
      sentBody = String(init?.body);
      return json(404, { error: 'backup_not_found' });
    });
    await retrieveFromVault({ clientId: 'c', ipcUrl: IPC });
    expect(JSON.parse(sentBody).expected_identity).toBe(b64url(KEY_A));
  });
});

// ── backupToVault guards ───────────────────────────────────────────

const emptyPayload = { version: 1, _summary: { countsByEntryType: {}, totalRecords: 0 }, cells: [] };
const fullSlot = {
  data: { _summary: { countsByEntryType: { T: 3 }, totalRecords: 3 } },
  label: 'latest',
  created_at: 1,
  data_size: 10,
};

describe('backupToVault', () => {
  it('refuses to replace a non-empty backup with an empty payload (default on)', async () => {
    mockFetch((url) => {
      if (url.endsWith('/backup/retrieve')) return json(200, fullSlot);
      return json(200, { label: 'latest', data_size: 1, created_at: 1 });
    });
    await expect(
      backupToVault({ clientId: 'c', appName: 'A', ipcUrl: IPC }, emptyPayload),
    ).rejects.toBeInstanceOf(EmptyBackupSkippedError);
  });

  it('writes an empty payload when the slot is confirmed absent', async () => {
    mockFetch((url) => {
      if (url.endsWith('/backup/retrieve')) return json(404, { error: 'backup_not_found' });
      return json(200, { label: 'latest', data_size: 1, created_at: 1 });
    });
    const r = await backupToVault({ clientId: 'c', appName: 'A', ipcUrl: IPC }, emptyPayload);
    expect(r.success).toBe(true);
  });

  it('protectNonEmpty: false skips the guard', async () => {
    mockFetch((url) => {
      if (url.endsWith('/backup/retrieve')) return json(200, fullSlot);
      return json(200, { label: 'latest', data_size: 1, created_at: 1 });
    });
    const r = await backupToVault(
      { clientId: 'c', appName: 'A', ipcUrl: IPC, protectNonEmpty: false },
      emptyPayload,
    );
    expect(r.success).toBe(true);
  });

  it('refuses when the vault holds a different identity than bound', async () => {
    bindVaultIdentity(b64url(KEY_A));
    mockFetch((url) => {
      if (url.endsWith('/status')) {
        return json(200, { unlocked: true, agent_pub_key: b64url(KEY_B) });
      }
      return json(200, { label: 'latest', data_size: 1, created_at: 1 });
    });
    await expect(
      backupToVault({ clientId: 'c', appName: 'A', ipcUrl: IPC }, { some: 'data' }),
    ).rejects.toBeInstanceOf(IdentityMismatchError);
  });

  it('proceeds when the vault identity matches across encodings, sending expected_identity', async () => {
    bindVaultIdentity(b58(KEY_A));
    let sentBody = '';
    mockFetch((url, init) => {
      if (url.endsWith('/status')) {
        return json(200, { unlocked: true, agent_pub_key: b64url(KEY_A) });
      }
      if (url.endsWith('/backup')) {
        sentBody = String(init?.body);
        return json(200, { label: 'latest', data_size: 1, created_at: 1 });
      }
      return json(404, { error: 'backup_not_found' });
    });
    const r = await backupToVault({ clientId: 'c', appName: 'A', ipcUrl: IPC }, { some: 'data' });
    expect(r.success).toBe(true);
    expect(JSON.parse(sentBody).expected_identity).toBe(b58(KEY_A));
  });

  it('maps a vault-side identity_mismatch refusal to IdentityMismatchError', async () => {
    mockFetch((url) => {
      if (url.endsWith('/backup')) return json(409, { error: 'identity_mismatch' });
      return json(404, { error: 'backup_not_found' });
    });
    await expect(
      backupToVault({ clientId: 'c', appName: 'A', ipcUrl: IPC }, { some: 'data' }),
    ).rejects.toBeInstanceOf(IdentityMismatchError);
  });
});

// ── onIdentityChanged ──────────────────────────────────────────────

describe('onIdentityChanged', () => {
  it('fires on an unlocked key change and never for locked', async () => {
    vi.useFakeTimers();
    const seen: Array<[string, string | null]> = [];
    let statusBody: Record<string, unknown> = { unlocked: true, agent_pub_key: b64url(KEY_A) };
    mockFetch(() => json(200, statusBody));

    const stop = onIdentityChanged((next, prev) => seen.push([next, prev]), {
      ipcUrl: IPC,
      intervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1100); // baseline observed
    statusBody = { unlocked: false, agent_pub_key: null };
    await vi.advanceTimersByTimeAsync(1100); // locked: not a change
    statusBody = { unlocked: true, agent_pub_key: b64url(KEY_B) };
    await vi.advanceTimersByTimeAsync(1100); // real change

    stop();
    vi.useRealTimers();

    expect(seen).toEqual([[b64url(KEY_B), b64url(KEY_A)]]);
  });
});

// ── browser-blocked loopback (3.1.0) ───────────────────────────────

function stubPermissions(state: 'granted' | 'denied' | 'prompt' | null, supported = ['loopback-network', 'local-network-access']) {
  vi.stubGlobal('navigator', {
    permissions: {
      query: async ({ name }: { name: string }) => {
        if (!supported.includes(name)) throw new TypeError(`${name} is not a valid permission name`);
        if (state === null) throw new TypeError('no permission');
        return { state };
      },
    },
  });
}

describe('loopbackPermissionState', () => {
  it('reads the new name first, falls back to the old one, else unknown', async () => {
    stubPermissions('denied');
    expect(await loopbackPermissionState()).toBe('denied');
    stubPermissions('granted', ['local-network-access']);
    expect(await loopbackPermissionState()).toBe('granted');
    vi.stubGlobal('navigator', {});
    expect(await loopbackPermissionState()).toBe('unknown');
    vi.stubGlobal('navigator', undefined);
    expect(await loopbackPermissionState()).toBe('unknown');
  });
});

describe('getVaultStatus: blocked vs not running', () => {
  it('network error + permission denied → blocked (the Vault may be running)', async () => {
    stubPermissions('denied');
    mockFetch(() => null);
    await expect(getVaultStatus(IPC)).resolves.toEqual({ running: false, unlocked: false, blocked: true });
  });

  it('network error with no permission signal → plain not running', async () => {
    vi.stubGlobal('navigator', {});
    mockFetch(() => null);
    await expect(getVaultStatus(IPC)).resolves.toEqual({ running: false, unlocked: false });
  });

  it('a non-2xx answer is a running-but-unhappy Vault, never blocked', async () => {
    stubPermissions('denied');
    mockFetch(() => json(503, {}));
    await expect(getVaultStatus(IPC)).resolves.toEqual({ running: false, unlocked: false });
  });

  it('declares the loopback target so https pages pass Chrome mixed-content checks', async () => {
    vi.stubGlobal('navigator', {});
    const seen: RequestInit[] = [];
    mockFetch((_u, init) => {
      seen.push(init!);
      return json(200, { unlocked: true, agent_pub_key: b64url(KEY_A) });
    });
    await getVaultStatus(IPC);
    expect((seen[0] as any).targetAddressSpace).toBe('loopback');
  });
});

describe('authenticateWithVault under a browser block', () => {
  it('throws VaultBlockedError, not VaultNotFoundError', async () => {
    stubPermissions('denied');
    mockFetch(() => null);
    await expect(authenticateWithVault('c', { ipcUrl: IPC })).rejects.toBeInstanceOf(VaultBlockedError);
  });

  it('still throws VaultNotFoundError when nothing is listening and the browser is not the reason', async () => {
    vi.stubGlobal('navigator', {});
    mockFetch(() => null);
    await expect(authenticateWithVault('c', { ipcUrl: IPC })).rejects.toBeInstanceOf(VaultNotFoundError);
  });
});
