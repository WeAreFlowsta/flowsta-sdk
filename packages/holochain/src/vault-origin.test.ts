import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FlowstaHolochainError,
  getVaultOrigin,
  getVaultStatus,
  linkFlowstaIdentity,
  setVaultOrigin,
  VaultRequestRefusedError,
} from './index';

const IPC = 'http://127.0.0.1:27777';
const VAULT_KEY = 'uhCAkVaultVaultVaultVaultVaultVaultVaultVaultVaultVau';
const AGENT = 'uhCAkInstallKeyOneOneOneOneOneOneOneOneOneOneOneOneOne';

type Seen = { url: string; origin: string | null };

/** Mock `fetch`; records each request's Origin header. */
function mockVault(route: (url: string) => Response): Seen[] {
  const calls: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), origin: new Headers(init?.headers ?? {}).get('origin') });
      return route(String(url));
    }),
  );
  return calls;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const status = () => json({ unlocked: true, agent_pub_key: VAULT_KEY, active_identity: VAULT_KEY });

afterEach(() => {
  setVaultOrigin(null);
  vi.unstubAllGlobals();
});

describe('setVaultOrigin', () => {
  it('sends no Origin of its own until an origin is set', async () => {
    const calls = mockVault(status);
    await getVaultStatus(IPC);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => c.origin === null)).toBe(true);
    expect(getVaultOrigin()).toBeNull();
  });

  it('puts the origin on every request to the Vault, a connect request included', async () => {
    setVaultOrigin('app://yourapp');
    const calls = mockVault((url) =>
      url.endsWith('/link-identity')
        ? json({ success: true, payload: { vault_agent_pub_key: VAULT_KEY, vault_signature: 'sig' }, link_token: 'tok' })
        : status(),
    );
    await linkFlowstaIdentity({ appName: 'Your App', clientId: 'flowsta_app_x', localAgentPubKey: AGENT, ipcUrl: IPC });
    expect(calls.some((c) => c.url.endsWith('/link-identity'))).toBe(true);
    expect(calls.every((c) => c.origin === 'app://yourapp')).toBe(true);
    expect(getVaultOrigin()).toBe('app://yourapp');
  });

  it('takes an origin only: a scheme and a host, no path', () => {
    for (const ok of ['app://yourapp', 'http://localhost:3000', 'tauri://localhost', 'https://example.org']) {
      expect(() => setVaultOrigin(ok)).not.toThrow();
    }
    for (const bad of ['yourapp', 'http://localhost:3000/', 'app://yourapp/page', 'https://example.org?x=1', '']) {
      expect(() => setVaultOrigin(bad)).toThrow(FlowstaHolochainError);
    }
  });

  it('a connect request the Vault refuses for its missing origin says what to do', async () => {
    const words = 'A connection is kept under the origin a request carries, and this request carried none.';
    mockVault((url) =>
      url.endsWith('/link-identity') ? json({ error: 'origin_required', description: words }, 403) : status(),
    );
    const refused = await linkFlowstaIdentity({ appName: 'Your App', clientId: 'flowsta_app_x', localAgentPubKey: AGENT, ipcUrl: IPC }).catch((e) => e);
    expect(refused).toBeInstanceOf(VaultRequestRefusedError);
    expect(refused.code).toBe('origin_required');
    expect(refused.message).toBe(words);
  });
});
