/**
 * @flowsta/auth-tauri
 *
 * Tauri v2 plugin for desktop apps that integrate with Flowsta Vault.
 * Unlike @flowsta/auth (which does OAuth in a browser), this plugin talks
 * directly to the local Tauri backend via Tauri's IPC commands.
 *
 * Use this package if you're building a **Tauri desktop app** that needs
 * Flowsta identity. For web apps, use @flowsta/auth instead.
 *
 * @example
 * ```typescript
 * import { FlowstaVaultAuth } from '@flowsta/auth-tauri';
 *
 * const vault = new FlowstaVaultAuth();
 *
 * // Check vault status
 * const status = await vault.getStatus();
 * if (status.unlocked) {
 *   const identity = await vault.getIdentity();
 *   console.log('DID:', identity.did);
 * }
 *
 * // Link with web account
 * const result = await vault.linkWebAccount();
 * ```
 */

// ── Types ──────────────────────────────────────────────────────────

export interface VaultStatus {
  /** Whether a vault file exists on disk */
  initialized: boolean;
  /** Whether the vault is currently unlocked (decrypted in memory) */
  unlocked: boolean;
  /** Flowsta Vault version */
  version: string;
  /** Agent public key (if unlocked) */
  agentPubKey?: string;
  /** User's DID (if unlocked) */
  did?: string;
}

export interface VaultIdentity {
  /** Agent public key in Holochain format (uhCAk...) */
  agentPubKey: string;
  /** W3C DID (did:flowsta:uhCAk...) */
  did: string;
  /** Installed hApp IDs on the local conductor */
  installedAppIds: string[];
  /** Unix timestamp of vault creation */
  createdAt: number;
}

export interface SetupResult {
  /** The generated agent public key */
  agentPubKey: string;
  /** The generated DID */
  did: string;
}

export interface LinkResult {
  /** Whether the link was created successfully */
  success: boolean;
  /** The web agent's public key (if linked) */
  webAgentKey?: string;
  /** Descriptive message */
  message: string;
}

// ── Tauri invoke type (peer dependency) ────────────────────────────

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let _invoke: InvokeFn | null = null;

async function getInvoke(): Promise<InvokeFn> {
  if (_invoke) return _invoke;
  // Dynamic import to avoid bundling @tauri-apps/api in non-Tauri contexts
  const { invoke } = await import('@tauri-apps/api/core');
  _invoke = invoke;
  return invoke;
}

// ── Main Class ─────────────────────────────────────────────────────

/**
 * FlowstaVaultAuth - Desktop identity management via Tauri IPC.
 *
 * Communicates with the Flowsta Vault Rust backend through Tauri's
 * invoke system. All cryptographic operations happen in the Rust backend.
 */
export class FlowstaVaultAuth {
  private apiUrl: string;

  /**
   * @param options Configuration options
   * @param options.apiUrl Flowsta API URL for agent linking. Default: 'https://auth-api.flowsta.com'
   */
  constructor(options?: { apiUrl?: string }) {
    this.apiUrl = options?.apiUrl || 'https://auth-api.flowsta.com';
  }

  /**
   * Get the current vault status.
   */
  async getStatus(): Promise<VaultStatus> {
    const invoke = await getInvoke();
    const status = await invoke<{
      initialized: boolean;
      unlocked: boolean;
      version: string;
      agent_pub_key?: string;
      did?: string;
    }>('get_vault_status');

    return {
      initialized: status.initialized,
      unlocked: status.unlocked,
      version: status.version,
      agentPubKey: status.agent_pub_key,
      did: status.did,
    };
  }

  /**
   * Set up a new vault from a recovery phrase and master password.
   * The seed phrase is used to derive keys and is never stored.
   */
  async setup(mnemonic: string, password: string): Promise<SetupResult> {
    const invoke = await getInvoke();
    const result = await invoke<{
      agent_pub_key: string;
      did: string;
    }>('setup_vault', { mnemonic, password });

    return {
      agentPubKey: result.agent_pub_key,
      did: result.did,
    };
  }

  /**
   * Unlock an existing vault with the master password.
   */
  async unlock(password: string): Promise<SetupResult> {
    const invoke = await getInvoke();
    const result = await invoke<{
      agent_pub_key: string;
      did: string;
    }>('unlock_vault', { password });

    return {
      agentPubKey: result.agent_pub_key,
      did: result.did,
    };
  }

  /**
   * Lock the vault (clears decrypted data from memory).
   */
  async lock(): Promise<void> {
    const invoke = await getInvoke();
    await invoke('lock_vault');
  }

  /**
   * Get the full identity info (requires unlocked vault).
   */
  async getIdentity(): Promise<VaultIdentity> {
    const invoke = await getInvoke();
    const id = await invoke<{
      agent_pub_key: string;
      did: string;
      installed_app_ids: string[];
      created_at: number;
    }>('get_identity');

    return {
      agentPubKey: id.agent_pub_key,
      did: id.did,
      installedAppIds: id.installed_app_ids,
      createdAt: id.created_at,
    };
  }

  /**
   * Validate a recovery phrase without storing it.
   */
  async validateRecoveryPhrase(mnemonic: string): Promise<boolean> {
    const invoke = await getInvoke();
    return invoke<boolean>('validate_recovery_phrase', { mnemonic });
  }

  /**
   * Link this desktop identity with the web account.
   *
   * Uses the stored recovery lookup hash to find the web agent,
   * signs the agent pair payload locally, and submits to the DHT
   * via the API.
   */
  async linkWebAccount(): Promise<LinkResult> {
    const invoke = await getInvoke();
    const result = await invoke<{
      success: boolean;
      web_agent_key?: string;
      message: string;
    }>('link_web_account', { apiUrl: this.apiUrl });

    return {
      success: result.success,
      webAgentKey: result.web_agent_key,
      message: result.message,
    };
  }

  /**
   * Get agents linked to this desktop identity.
   * Requires a JWT (from web authentication).
   */
  async getLinkedAgents(jwt: string): Promise<string[]> {
    const invoke = await getInvoke();
    return invoke<string[]>('get_linked_agents', {
      apiUrl: this.apiUrl,
      jwt,
    });
  }
}

export default FlowstaVaultAuth;
