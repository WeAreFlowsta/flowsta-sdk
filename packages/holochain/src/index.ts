/**
 * Flowsta Holochain SDK
 *
 * Enables Holochain applications to use Flowsta for signing actions.
 * Users authenticate with Flowsta, granting signing permission to your app.
 *
 * Supports two signing transports:
 * - **Remote** (default): Signing via Flowsta API (server-custodied keys)
 * - **IPC**: Signing via Flowsta Vault desktop app (localhost:27777, user-custodied keys)
 * - **Auto**: Probes for Flowsta Vault, falls back to remote
 *
 * @example
 * ```typescript
 * import { FlowstaAuth } from '@flowsta/auth';
 * import { FlowstaHolochain } from '@flowsta/holochain';
 *
 * const auth = new FlowstaAuth({
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yoursite.com/callback',
 *   scopes: ['openid', 'public_key', 'holochain:sign']
 * });
 *
 * const holochain = new FlowstaHolochain({
 *   auth, // Pass the auth instance
 *   transport: 'auto', // Use Vault if running, else remote
 * });
 *
 * const result = await holochain.signAction({
 *   type: 'CreateEntry',
 *   entry_type: 'message',
 *   payload: { content: 'Hello, Holochain!' }
 * });
 * ```
 */

// ── Types ──────────────────────────────────────────────────────────

export type TransportMode = 'remote' | 'ipc' | 'auto';
export type ActiveTransport = 'remote' | 'ipc';

export interface FlowstaHolochainConfig {
  /** Flowsta API URL. Default: 'https://auth-api.flowsta.com' */
  apiUrl?: string;
  /** Access token getter function or static token */
  accessToken: string | (() => string | null);
  /**
   * Signing transport mode.
   * - 'remote': Sign via API (default, existing behavior)
   * - 'ipc': Sign via Flowsta Vault desktop app (localhost:27777)
   * - 'auto': Probe for Vault on init, fall back to remote
   *
   * @default 'remote'
   */
  transport?: TransportMode;
  /** IPC server URL (Flowsta Vault). Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

export interface SignActionRequest {
  /** The Holochain action to sign */
  action: Record<string, unknown>;
  /** Human-readable reason for signing (shown in audit log) */
  reason?: string;
}

export interface SignBytesRequest {
  /** Base64-encoded bytes to sign */
  bytes: string;
  /** Human-readable reason for signing (shown in audit log) */
  reason?: string;
}

export interface SignActionResponse {
  success: boolean;
  /** The signed action */
  signedAction: Record<string, unknown>;
  /** The signature (base64) */
  signature: string;
  /** The agent public key that signed */
  agentPubKey: string;
  /** User's DID */
  did: string;
  /** When the action was signed */
  signedAt: string;
}

export interface SignBytesResponse {
  success: boolean;
  /** The signature (base64) */
  signature: string;
  /** The agent public key that signed */
  agentPubKey: string;
}

export interface SigningPermission {
  id: string;
  appId: string;
  appName: string;
  appLogo?: string;
  scopes: string[];
  grantedAt: string;
  lastUsedAt?: string;
  signCount: number;
}

export interface VaultStatus {
  /** Whether Flowsta Vault is running and reachable */
  running: boolean;
  /** Whether the vault is unlocked */
  unlocked: boolean;
  /** Agent public key (if unlocked) */
  agentPubKey?: string;
  /** User's DID (if unlocked) */
  did?: string;
  /** Vault version */
  version?: string;
}

export interface ConsentRequiredError {
  error: 'consent_required';
  errorDescription: string;
  requiredScope: string;
  clientId: string;
}

// ── Error Classes ──────────────────────────────────────────────────

export class FlowstaHolochainError extends Error {
  constructor(
    message: string,
    public code: string,
    public description?: string,
  ) {
    super(message);
    this.name = 'FlowstaHolochainError';
  }
}

export class ConsentRequired extends FlowstaHolochainError {
  constructor(
    public requiredScope: string,
    public clientId: string,
  ) {
    super(
      'User must grant signing permission. Re-authenticate with holochain:sign scope.',
      'consent_required',
      'User must authorize this app with holochain:sign scope',
    );
    this.name = 'ConsentRequired';
  }
}

// ── Transport Interface ────────────────────────────────────────────

interface SigningTransport {
  signAction(request: SignActionRequest): Promise<SignActionResponse>;
  signBytes(request: SignBytesRequest): Promise<SignBytesResponse>;
}

// ── Remote Transport (existing behavior) ───────────────────────────

class RemoteTransport implements SigningTransport {
  constructor(
    private apiUrl: string,
    private getToken: () => string | null,
  ) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new FlowstaHolochainError(
        'No access token available. User must be authenticated.',
        'unauthorized',
      );
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error === 'consent_required') {
        throw new ConsentRequired(
          data.required_scope || 'holochain:sign',
          data.client_id || '',
        );
      }
      throw new FlowstaHolochainError(
        data.error_description || data.error || 'Request failed',
        data.error || 'request_failed',
        data.error_description,
      );
    }

    return data;
  }

  async signAction(request: SignActionRequest): Promise<SignActionResponse> {
    const response = await this.request<{
      success: boolean;
      signed_action: Record<string, unknown>;
      signature: string;
      agent_pub_key: string;
      did: string;
      signed_at: string;
    }>('/holochain/sign', {
      method: 'POST',
      body: JSON.stringify({
        action: request.action,
        reason: request.reason,
      }),
    });

    return {
      success: response.success,
      signedAction: response.signed_action,
      signature: response.signature,
      agentPubKey: response.agent_pub_key,
      did: response.did,
      signedAt: response.signed_at,
    };
  }

  async signBytes(request: SignBytesRequest): Promise<SignBytesResponse> {
    const response = await this.request<{
      success: boolean;
      signature: string;
      agent_pub_key: string;
    }>('/holochain/sign/bytes', {
      method: 'POST',
      body: JSON.stringify({
        bytes: request.bytes,
        reason: request.reason,
      }),
    });

    return {
      success: response.success,
      signature: response.signature,
      agentPubKey: response.agent_pub_key,
    };
  }
}

// ── IPC Transport (Flowsta Vault desktop app) ──────────────────────

class IpcTransport implements SigningTransport {
  constructor(private ipcUrl: string) {}

  async signAction(request: SignActionRequest): Promise<SignActionResponse> {
    const response = await fetch(`${this.ipcUrl}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'action',
        action: request.action,
        reason: request.reason,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new FlowstaHolochainError(
        data.error || 'IPC sign request failed',
        'ipc_error',
        data.description,
      );
    }

    const data = await response.json();
    return {
      success: data.success,
      signedAction: data.signed_action || data.signedAction,
      signature: data.signature,
      agentPubKey: data.agent_pub_key || data.agentPubKey,
      did: data.did,
      signedAt: data.signed_at || data.signedAt || new Date().toISOString(),
    };
  }

  async signBytes(request: SignBytesRequest): Promise<SignBytesResponse> {
    const response = await fetch(`${this.ipcUrl}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bytes',
        bytes: request.bytes,
        reason: request.reason,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new FlowstaHolochainError(
        data.error || 'IPC sign request failed',
        'ipc_error',
        data.description,
      );
    }

    const data = await response.json();
    return {
      success: data.success,
      signature: data.signature,
      agentPubKey: data.agent_pub_key || data.agentPubKey,
    };
  }
}

// ── Main Class ─────────────────────────────────────────────────────

/**
 * FlowstaHolochain - Holochain signing integration
 *
 * Use this class to sign Holochain actions with the user's Flowsta identity.
 * Supports both remote signing (via API) and local signing (via Flowsta Vault).
 */
export class FlowstaHolochain {
  private apiUrl: string;
  private ipcUrl: string;
  private getToken: () => string | null;
  private transportMode: TransportMode;
  private transport: SigningTransport;
  private _activeTransport: ActiveTransport;

  private listeners: Array<(transport: ActiveTransport) => void> = [];

  constructor(config: FlowstaHolochainConfig) {
    this.apiUrl = config.apiUrl || 'https://auth-api.flowsta.com';
    this.ipcUrl = config.ipcUrl || 'http://127.0.0.1:27777';
    this.transportMode = config.transport || 'remote';

    this.getToken =
      typeof config.accessToken === 'function'
        ? config.accessToken
        : () => config.accessToken as string | null;

    // Default to remote transport; auto mode probes asynchronously
    this.transport = new RemoteTransport(this.apiUrl, this.getToken);
    this._activeTransport = 'remote';

    if (this.transportMode === 'ipc') {
      this.transport = new IpcTransport(this.ipcUrl);
      this._activeTransport = 'ipc';
    } else if (this.transportMode === 'auto') {
      // Probe IPC in the background
      this.probeIpc();
    }
  }

  /** Which transport is currently active */
  get activeTransport(): ActiveTransport {
    return this._activeTransport;
  }

  /**
   * Listen for transport changes (e.g., auto mode switching from remote to IPC)
   * @param listener Called when the active transport changes
   * @returns Unsubscribe function
   */
  onTransportChanged(
    listener: (transport: ActiveTransport) => void,
  ): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Probe the Flowsta Vault IPC server.
   * In 'auto' mode, this runs on construction. Can also be called manually.
   */
  async probeIpc(): Promise<VaultStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.ipcUrl}/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { running: false, unlocked: false };
      }

      const data = await response.json();
      const status: VaultStatus = {
        running: true,
        unlocked: !!data.unlocked,
        agentPubKey: data.agent_pub_key || data.agentPubKey,
        did: data.did,
        version: data.version,
      };

      // Switch to IPC if vault is running and unlocked
      if (
        status.unlocked &&
        this.transportMode === 'auto' &&
        this._activeTransport !== 'ipc'
      ) {
        this.transport = new IpcTransport(this.ipcUrl);
        this._activeTransport = 'ipc';
        this.listeners.forEach((l) => l('ipc'));
      }

      return status;
    } catch {
      return { running: false, unlocked: false };
    }
  }

  /**
   * Sign a Holochain action
   *
   * @param request - The action to sign
   * @returns The signed action with signature
   */
  async signAction(request: SignActionRequest): Promise<SignActionResponse> {
    return this.transport.signAction(request);
  }

  /**
   * Sign raw bytes
   *
   * @param request - The bytes to sign (base64 encoded)
   * @returns The signature
   */
  async signBytes(request: SignBytesRequest): Promise<SignBytesResponse> {
    return this.transport.signBytes(request);
  }

  /**
   * Get the user's signing permissions (remote transport only)
   */
  async getPermissions(): Promise<SigningPermission[]> {
    const token = this.getToken();
    if (!token) {
      throw new FlowstaHolochainError(
        'No access token available.',
        'unauthorized',
      );
    }

    const response = await fetch(`${this.apiUrl}/holochain/permissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new FlowstaHolochainError(
        data.error_description || data.error || 'Request failed',
        data.error || 'request_failed',
      );
    }

    return data.permissions.map(
      (p: {
        id: string;
        app_id: string;
        app_name: string;
        app_logo?: string;
        scopes: string[];
        granted_at: string;
        last_used_at?: string;
        sign_count: number;
      }) => ({
        id: p.id,
        appId: p.app_id,
        appName: p.app_name,
        appLogo: p.app_logo,
        scopes: p.scopes,
        grantedAt: p.granted_at,
        lastUsedAt: p.last_used_at,
        signCount: p.sign_count,
      }),
    );
  }

  /**
   * Revoke signing permission for an app
   */
  async revokePermission(appId: string): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      throw new FlowstaHolochainError(
        'No access token available.',
        'unauthorized',
      );
    }

    const response = await fetch(
      `${this.apiUrl}/holochain/permissions/${appId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();
    return data.success;
  }

  /**
   * Check if the user has granted signing permission
   */
  async hasSigningPermission(): Promise<boolean> {
    try {
      const permissions = await this.getPermissions();
      return permissions.some((p) => p.scopes.includes('holochain:sign'));
    } catch {
      return false;
    }
  }
}

/**
 * Create a Holochain client from an auth instance.
 *
 * @param auth - Object with getAccessToken method
 * @param options - Optional config overrides
 */
export function createHolochainClient(
  auth: { getAccessToken: () => string | null },
  options?: { apiUrl?: string; transport?: TransportMode; ipcUrl?: string },
): FlowstaHolochain {
  return new FlowstaHolochain({
    accessToken: () => auth.getAccessToken(),
    apiUrl: options?.apiUrl,
    transport: options?.transport,
    ipcUrl: options?.ipcUrl,
  });
}

// ── Agent Linking — Flowsta Vault Identity Provider ────────────────
//
// Standalone functions for third-party Holochain developers to link
// their app's agent key with the user's Flowsta Vault identity.
//
// The developer adds the `flowsta-agent-linking` Rust crate to their
// DNA, then uses these functions to get a signed attestation from the
// Vault via IPC.

export class VaultNotFoundError extends FlowstaHolochainError {
  constructor() {
    super(
      'Flowsta Vault is not running. The user must open Flowsta Vault.',
      'vault_not_found',
    );
    this.name = 'VaultNotFoundError';
  }
}

export class VaultLockedError extends FlowstaHolochainError {
  constructor() {
    super(
      'Flowsta Vault is locked. The user must unlock it first.',
      'vault_locked',
    );
    this.name = 'VaultLockedError';
  }
}

export class UserDeniedError extends FlowstaHolochainError {
  constructor() {
    super(
      'User denied the identity link request.',
      'user_denied',
    );
    this.name = 'UserDeniedError';
  }
}

export class InvalidClientIdError extends FlowstaHolochainError {
  constructor(message?: string) {
    super(
      message || 'Invalid client_id. Register your app at dev.flowsta.com',
      'invalid_client_id',
    );
    this.name = 'InvalidClientIdError';
  }
}

export class MissingClientIdError extends FlowstaHolochainError {
  constructor() {
    super(
      'client_id is required. Register your app at dev.flowsta.com to get one.',
      'missing_client_id',
    );
    this.name = 'MissingClientIdError';
  }
}

export class ApiUnreachableError extends FlowstaHolochainError {
  constructor() {
    super(
      'Could not verify app with Flowsta. Check internet connection.',
      'api_unreachable',
    );
    this.name = 'ApiUnreachableError';
  }
}

export interface LinkFlowstaIdentityOptions {
  /** Human-readable app name shown in Vault approval dialog */
  appName: string;
  /** Developer client_id from dev.flowsta.com (required for MAU tracking) */
  clientId: string;
  /** The third-party agent's public key in uhCAk... format */
  localAgentPubKey: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

export interface LinkFlowstaIdentityResult {
  success: boolean;
  payload: {
    /** Vault's agent public key in uhCAk... format */
    vaultAgentPubKey: string;
    /** Base64 standard encoded Ed25519 signature (64 bytes) */
    vaultSignature: string;
  };
}

/**
 * Request an agent-linking signature from Flowsta Vault.
 *
 * This is the main function for third-party Holochain developers to link
 * their app's agent key with the user's Flowsta identity. The Vault shows
 * an approval dialog, computes the sorted key pair payload, and signs it.
 *
 * After receiving the result, pass it to your zome's `create_external_link`:
 *
 * @example
 * ```typescript
 * import { linkFlowstaIdentity } from '@flowsta/holochain';
 *
 * const result = await linkFlowstaIdentity({
 *   appName: 'ChessChain',
 *   clientId: 'flowsta_app_abc123...',  // from dev.flowsta.com
 *   localAgentPubKey: myAgentKey,  // uhCAk... format
 * });
 *
 * // Call your own zome
 * await appWebsocket.callZome({
 *   role_name: 'chess',
 *   zome_name: 'agent_linking',
 *   fn_name: 'create_external_link',
 *   payload: {
 *     external_agent: decodeHashFromBase64(result.payload.vaultAgentPubKey),
 *     external_signature: base64ToSignature(result.payload.vaultSignature),
 *   },
 * });
 * ```
 *
 * @throws {VaultNotFoundError} Vault is not running or unreachable
 * @throws {VaultLockedError} Vault is locked
 * @throws {UserDeniedError} User rejected the approval dialog
 * @throws {InvalidClientIdError} client_id not registered at dev.flowsta.com
 * @throws {MissingClientIdError} client_id not provided
 * @throws {ApiUnreachableError} Cannot reach Flowsta API to verify app (first link requires internet)
 * @throws {FlowstaHolochainError} Other errors (timeout, invalid key, etc.)
 */
export async function linkFlowstaIdentity(
  options: LinkFlowstaIdentityOptions,
): Promise<LinkFlowstaIdentityResult> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  // Step 1: Check Vault is running and unlocked
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const statusResponse = await fetch(`${ipcUrl}/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!statusResponse.ok) {
      throw new VaultNotFoundError();
    }

    const status = await statusResponse.json();
    if (!status.unlocked) {
      throw new VaultLockedError();
    }
  } catch (err) {
    if (err instanceof FlowstaHolochainError) throw err;
    throw new VaultNotFoundError();
  }

  // Step 2: Request identity link signature
  const response = await fetch(`${ipcUrl}/link-identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_name: options.appName,
      client_id: options.clientId,
      app_agent_pub_key: options.localAgentPubKey,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = data.error || 'unknown_error';

    if (error === 'vault_locked') throw new VaultLockedError();
    if (error === 'user_denied') throw new UserDeniedError();
    if (error === 'invalid_client_id' || error === 'app_not_found' || error === 'app_disabled') throw new InvalidClientIdError(data.description);
    if (error === 'missing_client_id') throw new MissingClientIdError();
    if (error === 'api_unreachable') throw new ApiUnreachableError();

    throw new FlowstaHolochainError(
      data.description || `Identity link failed: ${error}`,
      error,
      data.description,
    );
  }

  const data = await response.json();

  return {
    success: true,
    payload: {
      vaultAgentPubKey: data.vault_agent_pub_key,
      vaultSignature: data.vault_signature,
    },
  };
}

export interface GetFlowstaIdentityOptions {
  /** @holochain/client AppWebsocket instance */
  appWebsocket: {
    callZome(args: {
      role_name: string;
      zome_name: string;
      fn_name: string;
      payload: unknown;
    }): Promise<unknown>;
  };
  /** DNA role name in the hApp manifest */
  roleName: string;
  /** Zome name. Default: 'agent_linking' */
  zomeName?: string;
  /** Agent public key to query (raw bytes, e.g. from @holochain/client) */
  agentPubKey: Uint8Array;
}

/**
 * Query linked Flowsta identities for an agent on your DHT.
 *
 * Calls the `get_linked_agents` function on the agent-linking coordinator zome.
 * Returns an array of linked agent public keys (as raw bytes).
 *
 * @example
 * ```typescript
 * const linked = await getFlowstaIdentity({
 *   appWebsocket,
 *   roleName: 'chess',
 *   agentPubKey: myAgentKey,
 * });
 * console.log(`Linked to ${linked.length} Flowsta identities`);
 * ```
 */
export async function getFlowstaIdentity(
  options: GetFlowstaIdentityOptions,
): Promise<Uint8Array[]> {
  const zomeName = options.zomeName || 'agent_linking';

  const result = await options.appWebsocket.callZome({
    role_name: options.roleName,
    zome_name: zomeName,
    fn_name: 'get_linked_agents',
    payload: options.agentPubKey,
  });

  return result as Uint8Array[];
}

// ── Revoke / Status — Flowsta Vault Identity ──────────────────────

export interface RevokeFlowstaIdentityOptions {
  /** Human-readable app name */
  appName: string;
  /** The third-party agent's public key in uhCAk... format */
  localAgentPubKey: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

/**
 * Notify Flowsta Vault that an identity link was revoked.
 *
 * Best-effort — if Vault is not running, returns `{ success: false }`
 * without throwing. The DHT revocation (calling `revoke_link` on your
 * zome) is what matters; this is just a courtesy notification so Vault
 * can update its UI immediately.
 *
 * @example
 * ```typescript
 * import { revokeFlowstaIdentity } from '@flowsta/holochain';
 *
 * // After calling revoke_link on your zome:
 * await revokeFlowstaIdentity({
 *   appName: 'ProofPoll',
 *   localAgentPubKey: myAgentKey,
 * });
 * ```
 */
export async function revokeFlowstaIdentity(
  options: RevokeFlowstaIdentityOptions,
): Promise<{ success: boolean }> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${ipcUrl}/revoke-identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        app_name: options.appName,
        app_agent_pub_key: options.localAgentPubKey,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return { success: !!data.success };
  } catch {
    // Vault not running or unreachable — not an error
    return { success: false };
  }
}

export interface CheckFlowstaLinkStatusOptions {
  /** The third-party agent's public key in uhCAk... format */
  localAgentPubKey: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

/**
 * Check if Flowsta Vault still considers this agent linked.
 *
 * Used to detect vault-side revocation. If the user revoked from Vault's UI,
 * this will return `{ linked: false }` so the third-party app can clean up
 * its DHT entry.
 *
 * Returns `{ linked: false }` if Vault is not running (can't determine).
 *
 * @example
 * ```typescript
 * import { checkFlowstaLinkStatus } from '@flowsta/holochain';
 *
 * const status = await checkFlowstaLinkStatus({
 *   localAgentPubKey: myAgentKey,
 * });
 *
 * if (!status.linked) {
 *   // Vault revoked — clean up DHT entry
 *   await appWebsocket.callZome({ ... fn_name: 'revoke_link', ... });
 * }
 * ```
 */
export async function checkFlowstaLinkStatus(
  options: CheckFlowstaLinkStatusOptions,
): Promise<{ linked: boolean; appName?: string }> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${ipcUrl}/link-status?app_agent_pub_key=${encodeURIComponent(options.localAgentPubKey)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return { linked: false };
    }

    const data = await response.json();
    return {
      linked: !!data.linked,
      appName: data.app_name,
    };
  } catch {
    // Vault not running — can't determine
    return { linked: false };
  }
}

export default FlowstaHolochain;
