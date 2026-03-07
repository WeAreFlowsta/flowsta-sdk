/**
 * Flowsta Holochain SDK
 *
 * Enables third-party Holochain applications to link their agent keys
 * with the user's Flowsta Vault identity. The Vault acts as a local
 * identity provider (like MetaMask for Ethereum) for Holochain apps.
 *
 * The developer adds the `flowsta-agent-linking` Rust crate to their DNA,
 * then uses this SDK to request a signed identity attestation from the
 * Vault via IPC. The attestation is committed to their own DHT as an
 * `IsSamePersonEntry` that anyone can verify via Ed25519 cryptography.
 *
 * @example
 * ```typescript
 * import { linkFlowstaIdentity } from '@flowsta/holochain';
 *
 * const result = await linkFlowstaIdentity({
 *   appName: 'ChessChain',
 *   clientId: 'flowsta_app_abc123...',
 *   localAgentPubKey: myAgentKey, // uhCAk... format
 * });
 *
 * // Pass to your zome's create_external_link
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
 */

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

// ── Types ──────────────────────────────────────────────────────────

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

export interface RevokeFlowstaIdentityOptions {
  /** Human-readable app name */
  appName: string;
  /** The third-party agent's public key in uhCAk... format */
  localAgentPubKey: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

export interface CheckFlowstaLinkStatusOptions {
  /** The third-party agent's public key in uhCAk... format */
  localAgentPubKey: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

export interface VaultStatus {
  /** Whether Flowsta Vault is running and reachable */
  running: boolean;
  /** Whether the vault is unlocked */
  unlocked: boolean;
  /** Agent public key (if unlocked) */
  agentPubKey?: string;
  /** Vault version */
  version?: string;
}

// ── Functions ──────────────────────────────────────────────────────

/**
 * Check the status of Flowsta Vault.
 *
 * @param ipcUrl - Vault IPC URL. Default: 'http://127.0.0.1:27777'
 * @returns Vault status (running, unlocked, agentPubKey, version)
 */
export async function getVaultStatus(
  ipcUrl = 'http://127.0.0.1:27777',
): Promise<VaultStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${ipcUrl}/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { running: false, unlocked: false };
    }

    const data = await response.json();
    return {
      running: true,
      unlocked: !!data.unlocked,
      agentPubKey: data.agent_pub_key || data.agentPubKey,
      version: data.version,
    };
  } catch {
    return { running: false, unlocked: false };
  }
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
 *   clientId: 'flowsta_app_abc123...',
 *   localAgentPubKey: myAgentKey,
 * });
 *
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

/**
 * Notify Flowsta Vault that an identity link was revoked.
 *
 * Best-effort -- if Vault is not running, returns `{ success: false }`
 * without throwing. The DHT revocation (calling `revoke_link` on your
 * zome) is what matters; this is just a courtesy notification so Vault
 * can update its UI immediately.
 *
 * @example
 * ```typescript
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
    return { success: false };
  }
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
 * const status = await checkFlowstaLinkStatus({
 *   localAgentPubKey: myAgentKey,
 * });
 *
 * if (!status.linked) {
 *   // Vault revoked -- clean up DHT entry
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
    return { linked: false };
  }
}
