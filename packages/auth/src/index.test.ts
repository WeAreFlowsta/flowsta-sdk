import { afterEach, describe, expect, it, vi } from 'vitest';
import { agentKeysMatch, FlowstaAuth, loopbackPermissionState, VaultBlockedError, VaultRequiredError } from './index';

// Build a plausible 39-byte agent key (0x84 0x20 0x24 prefix + 32-byte key +
// 4-byte DHT location) and render it in both encodings agent keys actually
// travel in: uhCAk + base64url (Vault /status) and uhCAk + base58 (/auth/me).
function keyBytes(fill: number): Uint8Array {
  const b = new Uint8Array(39);
  b[0] = 0x84;
  b[1] = 0x20;
  b[2] = 0x24;
  for (let i = 3; i < 39; i++) b[i] = (fill + i) % 256;
  return b;
}

function base64urlForm(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return (
    'u' +
    btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  );
}

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Form(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = BASE58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return 'u' + out;
}

describe('agentKeysMatch', () => {
  it('matches a key against itself in either encoding', () => {
    const k = keyBytes(7);
    expect(agentKeysMatch(base64urlForm(k), base64urlForm(k))).toBe(true);
    expect(agentKeysMatch(base58Form(k), base58Form(k))).toBe(true);
  });

  it('matches the SAME key across base64url and base58 - the false-mismatch this exists to prevent', () => {
    const k = keyBytes(7);
    expect(agentKeysMatch(base64urlForm(k), base58Form(k))).toBe(true);
    expect(agentKeysMatch(base58Form(k), base64urlForm(k))).toBe(true);
  });

  it('reports a definite mismatch for different keys, cross-encoding included', () => {
    const a = keyBytes(7);
    const b = keyBytes(99);
    expect(agentKeysMatch(base64urlForm(a), base64urlForm(b))).toBe(false);
    expect(agentKeysMatch(base64urlForm(a), base58Form(b))).toBe(false);
  });

  it('abstains (null) when either side cannot be decoded - refusal requires certainty', () => {
    const good = base64urlForm(keyBytes(7));
    expect(agentKeysMatch(good, 'not-a-key')).toBeNull();
    expect(agentKeysMatch('', good)).toBeNull();
    // Missing multibase prefix
    expect(agentKeysMatch(good.slice(1), good)).toBeNull();
    // Wrong prefix bytes (not an agent key)
    const notAgent = new Uint8Array(39).fill(1);
    expect(agentKeysMatch(base64urlForm(notAgent), good)).toBeNull();
    // Wrong length
    expect(agentKeysMatch('u' + 'AAAA', good)).toBeNull();
  });

  it('identical strings short-circuit to true even when undecodable', () => {
    expect(agentKeysMatch('uWEIRD', 'uWEIRD')).toBe(true);
  });
});

// ── browser-blocked loopback (2.5.0) ───────────────────────────────

function stubBrowser(opts: { permission: 'denied' | 'granted' | null; fetchOk?: boolean; apiStatus?: number; session?: boolean }) {
  const store = new Map<string, string>();
  if (opts.session) {
    store.set('flowsta_access_token', 'tok');
    store.set('flowsta_user', JSON.stringify({ id: 'u1', agentPubKey: 'uhCAkKEY', hostingModel: 'device-hosted' }));
  }
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('navigator', {
    permissions:
      opts.permission === null
        ? undefined
        : { query: async () => ({ state: opts.permission }) },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('127.0.0.1')) {
        if (opts.fetchOk) return new Response(JSON.stringify({ unlocked: true, agent_pub_key: 'uhCAkKEY' }), { status: 200 });
        throw new TypeError('fetch failed');
      }
      return new Response(JSON.stringify({ error: 'vault_required' }), { status: opts.apiStatus ?? 403 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('detectVault: blocked vs not running (2.5.0)', () => {
  it('every port refused + permission denied → blocked', async () => {
    stubBrowser({ permission: 'denied' });
    const auth = new FlowstaAuth({ clientId: 'c', redirectUri: 'https://app/cb' });
    await expect(auth.detectVault()).resolves.toEqual({ running: false, blocked: true });
  });

  it('every port refused, no permission signal → plain not running', async () => {
    stubBrowser({ permission: null });
    const auth = new FlowstaAuth({ clientId: 'c', redirectUri: 'https://app/cb' });
    await expect(auth.detectVault()).resolves.toEqual({ running: false });
  });

  it('a running Vault is reported running regardless of the permission API', async () => {
    stubBrowser({ permission: 'denied', fetchOk: true });
    const auth = new FlowstaAuth({ clientId: 'c', redirectUri: 'https://app/cb' });
    await expect(auth.detectVault()).resolves.toMatchObject({ running: true, agentPubKey: 'uhCAkKEY' });
  });

  it('loopbackPermissionState reports what the browser decided', async () => {
    stubBrowser({ permission: 'granted' });
    expect(await loopbackPermissionState()).toBe('granted');
    stubBrowser({ permission: null });
    expect(await loopbackPermissionState()).toBe('unknown');
  });
});

describe('signFile when the browser blocks the Vault (2.5.0)', () => {
  it('throws VaultBlockedError - not "install the Vault"', async () => {
    stubBrowser({ permission: 'denied', session: true });
    const auth = new FlowstaAuth({ clientId: 'c', redirectUri: 'https://app/cb' });
    await expect(auth.signFile({ fileHash: 'a'.repeat(64) })).rejects.toBeInstanceOf(VaultBlockedError);
  });

  it('still throws VaultRequiredError when the browser is not the reason', async () => {
    stubBrowser({ permission: null, session: true });
    const auth = new FlowstaAuth({ clientId: 'c', redirectUri: 'https://app/cb' });
    await expect(auth.signFile({ fileHash: 'a'.repeat(64) })).rejects.toBeInstanceOf(VaultRequiredError);
  });
});
