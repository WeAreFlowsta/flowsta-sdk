/**
 * The desktop-to-web hand-off: a desktop app that already holds the person's
 * identity (through the Flowsta Vault) opens this web app's callback URL with
 * the authorization code - and the PKCE verifier and state in the URL
 * FRAGMENT, which never reaches a server or a Referer. Adopting the fragment
 * puts them where the normal callback expects them, then clears the fragment
 * so it is not kept in history. See `@flowsta/holochain` `openWebSignedIn`.
 */
import { storeCodeVerifier } from './pkce.js';
import { storeState } from './state.js';

export interface HandoffFragment {
  verifier: string;
  state: string;
  /** The identity's agent key the desktop app signed in with (optional). */
  agentPubKey?: string;
}

/** sessionStorage key for the agent key a hand-off carried, for the site to read after its code exchange. */
export const HANDOFF_AGENT_KEY = 'flowsta_handoff_agent_pub_key';

/** The hand-off fields of a URL fragment (`#v=…&s=…`), or null. Pure. */
export function parseHandoffFragment(hash: string): HandoffFragment | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const verifier = params.get('v');
  const state = params.get('s');
  if (!verifier || !state) return null;
  if (!/^[A-Za-z0-9._~-]{32,128}$/.test(verifier) || !/^[A-Za-z0-9._~-]{16,128}$/.test(state)) return null;
  const agent = params.get('a');
  const agentPubKey = agent && /^u[A-Za-z0-9+/=_-]{40,80}$/.test(agent) ? agent : undefined;
  return agentPubKey ? { verifier, state, agentPubKey } : { verifier, state };
}

/**
 * On the callback page: if the URL carries a hand-off fragment, store its
 * verifier and state the way the button would have, and drop the fragment
 * from the address bar and history. Returns true when a hand-off was adopted.
 */
export function adoptHandoffFragment(): boolean {
  if (typeof window === 'undefined') return false;
  const found = parseHandoffFragment(window.location.hash || '');
  if (!found) return false;
  storeCodeVerifier(found.verifier, found.state);
  storeState(found.state);
  try {
    if (found.agentPubKey) sessionStorage.setItem(HANDOFF_AGENT_KEY, found.agentPubKey);
    else sessionStorage.removeItem(HANDOFF_AGENT_KEY);
  } catch {
    /* no storage */
  }
  try {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  } catch {
    /* an unusual environment keeps the fragment; the code is single-use anyway */
  }
  return true;
}
