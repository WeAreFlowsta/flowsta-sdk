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

export class BackupTooLargeError extends FlowstaHolochainError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `Backup payload is ${sizeBytes} bytes, exceeds Vault limit of ${maxBytes} bytes.`,
      'backup_too_large',
    );
    this.name = 'BackupTooLargeError';
  }
}

export class DispatcherFailedError extends FlowstaHolochainError {
  constructor(
    public readonly record: BackupRecord,
    public readonly cause: unknown,
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(
      `Restore dispatcher failed for ${record.entryType}: ${reason}`,
      'dispatcher_failed',
    );
    this.name = 'DispatcherFailedError';
  }
}

export class RestoreInProgressError extends FlowstaHolochainError {
  constructor() {
    super(
      'A restore operation is already in progress for this client_id.',
      'restore_in_progress',
    );
    this.name = 'RestoreInProgressError';
  }
}

export class DecodeFailedError extends FlowstaHolochainError {
  constructor(public readonly entryType: string, public readonly cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(
      `Decoder failed for entry type "${entryType}": ${reason}`,
      'decode_failed',
    );
    this.name = 'DecodeFailedError';
  }
}

// ── Backup Types ──────────────────────────────────────────────────

export interface FlowstaBackupOptions {
  /** Developer client_id from dev.flowsta.com */
  clientId: string;
  /** Human-readable app name */
  appName: string;
  /** Optional label for versioned backups (default: "latest") */
  label?: string;
  /** MIME type hint (default: "application/json") */
  contentType?: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

export interface FlowstaBackupResult {
  success: boolean;
  label: string;
  dataSize: number;
  createdAt: number;
}

export interface FlowstaBackupRetrieveOptions {
  /** Developer client_id */
  clientId: string;
  /** Backup label to retrieve (default: "latest") */
  label?: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
}

export interface FlowstaBackupEntry {
  clientId: string;
  appName: string;
  backupCount: number;
  totalSize: number;
  lastBackupAt: number;
}

export interface FlowstaBackupStats {
  appCount: number;
  totalBackups: number;
  totalSize: number;
  apps: FlowstaBackupEntry[];
}

export interface FlowstaAutoBackupConfig {
  /** Developer client_id from dev.flowsta.com */
  clientId: string;
  /** Human-readable app name */
  appName: string;
  /** Function that returns the data to back up */
  getData: () => unknown | Promise<unknown>;
  /** Backup interval in minutes (default: 60). Set to 0 for manual only. */
  intervalMinutes?: number;
  /** Optional label (default: "latest" — overwrites each time) */
  label?: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
  /** Called when backup succeeds */
  onSuccess?: (result: FlowstaBackupResult) => void;
  /** Called when backup fails */
  onError?: (error: Error) => void;
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
  /** Developer client_id from dev.flowsta.com */
  clientId: string;
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
  /** Display name of the currently-unlocked Flowsta account.
   *  Only populated when the requesting app has the `display_name` scope
   *  configured at dev.flowsta.com and the user approved it at link time. */
  displayName?: string;
  /** Profile picture (data URI or URL) of the currently-unlocked Flowsta account.
   *  Only populated when the requesting app has the `profile_picture` scope. */
  profilePicture?: string;
  /** Unique global username of the currently-unlocked Flowsta account
   *  (claimed at flowsta.com). Only populated when the requesting app has
   *  the `username` scope configured at dev.flowsta.com. */
  webUsername?: string;
  /** Vault version */
  version?: string;
}

/**
 * Rich link-status returned by `getFlowstaLinkStatus()`. Distinguishes the
 * three states a third-party app can find itself in vs. Flowsta Vault.
 *
 * Use this instead of the boolean returned by the older `checkFlowstaLinkStatus`
 * — it lets you tell apart "the user genuinely unlinked / changed Vault account"
 * (`state: 'unlinked'`) from "Vault isn't running right now"
 * (`state: 'offline'`), which want very different UX responses.
 */
export type FlowstaLinkStatus =
  | {
      /** Vault is running, the app's agent is in its linked-apps list. */
      state: 'linked';
      /** Display name Vault has on file for this app, if known. */
      appName?: string;
    }
  | {
      /**
       * Vault is running but does NOT recognize the app's agent as linked.
       * Could mean the user unlinked from Vault's UI, switched to a
       * different Flowsta account, or restored a fresh Vault from a
       * different recovery phrase. In all cases the recommended UX is the
       * same: surface a clear "reconnect or disconnect" prompt to the user
       * rather than silently revoking on their behalf.
       */
      state: 'unlinked';
    }
  | {
      /**
       * Vault is not reachable. Treat existing local link state as
       * authoritative for now (offline-tolerant) — don't revoke yet,
       * the Vault may simply be closed.
       */
      state: 'offline';
    };

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
      displayName: data.display_name || data.displayName,
      profilePicture: data.profile_picture || data.profilePicture,
      webUsername: data.web_username || data.webUsername,
      version: data.version,
    };
  } catch {
    return { running: false, unlocked: false };
  }
}

/**
 * Get the current link status between this app and Flowsta Vault, with
 * enough nuance to distinguish "Vault running but says no" from
 * "Vault not running right now".
 *
 * This is the recommended replacement for `checkFlowstaLinkStatus` —
 * the old boolean conflates the offline and unlinked states, which leads
 * apps to silently revoke users when the Vault is simply closed.
 *
 * @example
 * ```typescript
 * const status = await getFlowstaLinkStatus({
 *   clientId: import.meta.env.VITE_FLOWSTA_CLIENT_ID,
 *   localAgentPubKey: myAgentKey,
 * });
 *
 * switch (status.state) {
 *   case 'linked':
 *     // All good — full feature access.
 *     break;
 *   case 'unlinked':
 *     // Vault running but doesn't recognize this link. Show a banner
 *     // letting the user re-link with their current Vault account, or
 *     // disconnect deliberately. Do NOT auto-revoke.
 *     break;
 *   case 'offline':
 *     // Vault not running. Trust local state, surface a subtle hint
 *     // ("reconnect Vault to sync") if needed.
 *     break;
 * }
 * ```
 */
export async function getFlowstaLinkStatus(
  options: CheckFlowstaLinkStatusOptions,
): Promise<FlowstaLinkStatus> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${ipcUrl}/link-status?client_id=${encodeURIComponent(options.clientId)}&app_agent_pub_key=${encodeURIComponent(options.localAgentPubKey)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      // HTTP-level error from a running Vault. Treat as offline so we don't
      // surface a misleading "unlinked" state — the request shape may be
      // wrong or the endpoint temporarily unhealthy.
      return { state: 'offline' };
    }

    const data = await response.json();
    if (data.linked) {
      return { state: 'linked', appName: data.app_name };
    }
    return { state: 'unlinked' };
  } catch {
    // fetch threw — Vault not reachable.
    return { state: 'offline' };
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
 * @deprecated Prefer {@link getFlowstaLinkStatus} which returns a richer
 * `{ state: 'linked' | 'unlinked' | 'offline' }` shape. This function
 * collapses "Vault not running" and "Vault says no link" into the same
 * `{ linked: false }` response, which often leads apps to silently revoke
 * users when the Vault is simply closed. Kept for backward compatibility.
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
      `${ipcUrl}/link-status?client_id=${encodeURIComponent(options.clientId)}&app_agent_pub_key=${encodeURIComponent(options.localAgentPubKey)}`,
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

// ── Backup Functions ──────────────────────────────────────────────

/**
 * Back up data to the user's Flowsta Vault.
 *
 * The vault encrypts the data at rest using AES-256-GCM. The user can
 * view, export, or delete backups from the Vault's "Your Data" page.
 *
 * @example
 * ```typescript
 * import { backupToVault } from '@flowsta/holochain';
 *
 * const myData = await getMyAppData();
 * const result = await backupToVault({
 *   clientId: 'flowsta_app_abc123...',
 *   appName: 'ProofPoll',
 * }, myData);
 *
 * console.log(`Backed up ${result.dataSize} bytes`);
 * ```
 *
 * @throws {VaultNotFoundError} Vault is not running
 * @throws {VaultLockedError} Vault is locked
 * @throws {FlowstaHolochainError} Backup failed (e.g. too large, too many backups)
 */
export async function backupToVault(
  options: FlowstaBackupOptions,
  data: unknown,
): Promise<FlowstaBackupResult> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    response = await fetch(`${ipcUrl}/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        client_id: options.clientId,
        app_name: options.appName,
        label: options.label,
        data,
        content_type: options.contentType,
      }),
    });
    clearTimeout(timeout);
  } catch {
    throw new VaultNotFoundError();
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (err.error === 'vault_locked' || err.error === 'vault_never_unlocked') throw new VaultLockedError();
    throw new FlowstaHolochainError(
      err.description || 'Backup failed',
      err.error || 'backup_failed',
      err.description,
    );
  }

  const result = await response.json();
  return {
    success: true,
    label: result.label,
    dataSize: result.data_size,
    createdAt: result.created_at,
  };
}

/**
 * Retrieve a backup from the user's Flowsta Vault.
 *
 * @example
 * ```typescript
 * import { retrieveFromVault } from '@flowsta/holochain';
 *
 * const backup = await retrieveFromVault({
 *   clientId: 'flowsta_app_abc123...',
 * });
 *
 * if (backup) {
 *   await importData(backup.data);
 * }
 * ```
 *
 * @returns The backup data and metadata, or null if no backup exists
 */
export async function retrieveFromVault(
  options: FlowstaBackupRetrieveOptions,
): Promise<{ data: unknown; label?: string; createdAt: number; dataSize: number } | null> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    response = await fetch(`${ipcUrl}/backup/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        client_id: options.clientId,
        label: options.label,
      }),
    });
    clearTimeout(timeout);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return {
    data: result.data,
    label: result.label,
    createdAt: result.created_at,
    dataSize: result.data_size,
  };
}

/**
 * List all backups stored in the user's Flowsta Vault.
 *
 * @returns Backup stats for all apps, or empty stats if vault is unavailable
 */
export async function listVaultBackups(
  ipcUrl = 'http://127.0.0.1:27777',
): Promise<FlowstaBackupStats> {
  const empty: FlowstaBackupStats = { appCount: 0, totalBackups: 0, totalSize: 0, apps: [] };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ipcUrl}/backup/list`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return empty;

    const data = await response.json();
    return {
      appCount: data.app_count,
      totalBackups: data.total_backups,
      totalSize: data.total_size,
      apps: (data.apps || []).map((a: Record<string, unknown>) => ({
        clientId: a.client_id,
        appName: a.app_name,
        backupCount: a.backup_count,
        totalSize: a.total_size,
        lastBackupAt: a.last_backup_at,
      })),
    };
  } catch {
    return empty;
  }
}

// `startAutoBackup` is defined later in the file with both the v2.3.0 and
// v2.4.0+ signatures via overloads. See the "Generic source-chain backup
// helpers" section near the end of this file.

// ── Sign It: Document Signing ─────────────────────────────────────

export class SigningDnaNotInstalledError extends FlowstaHolochainError {
  constructor() {
    super(
      'Signing DNA is not installed in the Vault. Update to the latest Flowsta Vault.',
      'signing_dna_not_installed',
    );
    this.name = 'SigningDnaNotInstalledError';
  }
}

export interface SignDocumentOptions {
  /** Developer client_id from dev.flowsta.com */
  clientId: string;
  /** App display name (shown in the Vault approval dialog) */
  appName: string;
  /** SHA-256 hex string of the file (64 characters) */
  fileHash: string;
  /** Human-readable label shown in the approval dialog (e.g., "Report.pdf") */
  label?: string;
  /** Why this file is being signed */
  intent?: 'authorship' | 'approval' | 'witness' | 'receipt' | 'agreement';
  /** AI generation disclosure */
  aiGeneration?: 'none' | 'assisted' | 'generated';
  /** Content rights manifest */
  contentRights?: {
    license?: string;
    commercialLicensing?: 'not_available' | 'open_to_licensing';
    aiTraining?: 'allowed' | 'allowed_with_attribution' | 'requires_license' | 'not_allowed';
    contactPreference?: 'no_contact' | 'allow_contact_requests';
  };
  /** IPC URL override (default: http://127.0.0.1:27777) */
  ipcUrl?: string;
}

export interface SignDocumentResult {
  success: boolean;
  fileHash: string;
  /** Base64 Ed25519 signature */
  signature: string;
  /** Holochain agent public key in uhCAk... format */
  agentPubKey: string;
  /** ISO 8601 timestamp */
  signedAt: string;
  /** DHT action hash (null if signing DNA not yet active on conductor) */
  actionHash: string | null;
}

/**
 * Sign a document hash via the Flowsta Vault IPC server.
 *
 * The user sees an approval dialog in the Vault showing the app name,
 * file label, and hash. If approved, the Vault signs the hash with
 * the user's Ed25519 device key and commits a SignatureRecord to the
 * signing DNA on the local conductor.
 *
 * @example
 * ```typescript
 * import { signDocument } from '@flowsta/holochain';
 *
 * const result = await signDocument({
 *   clientId: 'flowsta_app_abc123...',
 *   appName: 'ArtStudio',
 *   fileHash: 'a7f3b9c1e2d4...', // SHA-256 hex
 *   label: 'Illustration.png',
 *   intent: 'authorship',
 *   aiGeneration: 'none',
 *   contentRights: {
 *     license: 'cc-by',
 *     aiTraining: 'not_allowed',
 *     contactPreference: 'allow_contact_requests',
 *   },
 * });
 *
 * console.log('Signed:', result.signature);
 * console.log('Action hash:', result.actionHash);
 * ```
 *
 * @throws {VaultNotFoundError} Vault is not running
 * @throws {VaultLockedError} Vault is locked
 * @throws {UserDeniedError} User rejected the signing request
 * @throws {SigningDnaNotInstalledError} Signing DNA not available
 */
export async function signDocument(
  options: SignDocumentOptions,
): Promise<SignDocumentResult> {
  const ipcUrl = options.ipcUrl || 'http://127.0.0.1:27777';

  // Check Vault is running and unlocked
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const statusResponse = await fetch(`${ipcUrl}/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!statusResponse.ok) throw new VaultNotFoundError();
    const status = await statusResponse.json();
    if (!status.unlocked) throw new VaultLockedError();
  } catch (err) {
    if (err instanceof FlowstaHolochainError) throw err;
    throw new VaultNotFoundError();
  }

  // Request document signature
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70000); // 70s (60s Vault timeout + buffer)

  try {
    const response = await fetch(`${ipcUrl}/sign-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        file_hash: options.fileHash,
        label: options.label,
        intent: options.intent,
        ai_generation: options.aiGeneration,
        content_rights: options.contentRights
          ? {
              license: options.contentRights.license,
              commercial_licensing: options.contentRights.commercialLicensing,
              ai_training: options.contentRights.aiTraining,
              contact_preference: options.contentRights.contactPreference,
            }
          : undefined,
        app_name: options.appName,
        client_id: options.clientId,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = data.error || 'unknown_error';

      if (error === 'vault_locked') throw new VaultLockedError();
      if (error === 'user_denied') throw new UserDeniedError();
      if (error === 'signing_dna_not_installed') throw new SigningDnaNotInstalledError();

      throw new FlowstaHolochainError(
        data.description || `Document signing failed: ${error}`,
        error,
        data.description,
      );
    }

    const data = await response.json();

    return {
      success: true,
      fileHash: data.file_hash,
      signature: data.signature,
      agentPubKey: data.agent_pub_key,
      signedAt: data.signed_at,
      actionHash: data.action_hash || null,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof FlowstaHolochainError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new FlowstaHolochainError(
        'Document signing timed out. The user may not have responded.',
        'timeout',
      );
    }
    throw new VaultNotFoundError();
  }
}

/**
 * Check if the Vault has document signing capability (signing DNA installed).
 *
 * @example
 * ```typescript
 * const status = await getSigningStatus();
 * if (status.available) {
 *   // Show "Sign with Flowsta" button
 * }
 * ```
 */
export async function getSigningStatus(
  ipcUrl = 'http://127.0.0.1:27777',
): Promise<{ available: boolean; vaultRunning: boolean; vaultUnlocked: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${ipcUrl}/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { available: false, vaultRunning: false, vaultUnlocked: false };
    }

    const status = await response.json();
    return {
      available: status.unlocked === true,
      vaultRunning: true,
      vaultUnlocked: status.unlocked === true,
    };
  } catch {
    return { available: false, vaultRunning: false, vaultUnlocked: false };
  }
}

// ── Generic source-chain backup helpers (v2.4.0+) ──────────────────
//
// Replaces the per-app `get_export_data` pattern with a generic
// `dumpFullState`-based capture. Each backed-up record carries both a
// human_readable view (decoded entry, for the user's CAL §4.2.1 export)
// AND a raw_record view (signed Holochain record, for restore).
//
// See build-docs/current/GENERIC_BACKUP_PLAN.md.

/** Minimal subset of @holochain/client AdminWebsocket needed for backup. */
export interface AdminWebsocketLike {
  dumpFullState(req: { cell_id: unknown }): Promise<{
    source_chain_dump: {
      records: Array<{
        signature: unknown;
        action_address: unknown;
        action: { type: string; author: unknown; timestamp: number; [k: string]: unknown };
        entry: { entry_type?: string; entry?: Uint8Array | string } | undefined;
      }>;
      published_ops_count: number;
    };
  }>;
}

/** A single record in a canonical-shape backup. */
export interface BackupRecord {
  /** Entry type name from the DNA (e.g. "Poll", "Vote"). */
  entryType: string;
  /** Action hash as a base64 string. */
  actionHash: string;
  /** Action timestamp in milliseconds since epoch. */
  createdAtMs: number;
  /** Decoded entry as plain JSON. Populated by the caller-supplied decoder. */
  human_readable: unknown;
  /** Signed Holochain record for restore + verification. */
  raw_record: {
    action: unknown;
    action_address: unknown;
    signature: unknown;
    /** Base64-encoded MessagePack bytes of the entry. Undefined when the action has no entry payload. */
    entry_b64: string | undefined;
  };
  /** Role name of the cell this record was authored in. */
  cellRoleName: string;
}

/** Per-entry-type count summary that Vault can render without decrypting. */
export interface BackupSummary {
  /** Counts keyed by entryType. */
  countsByEntryType: Record<string, number>;
  /** Total record count across all entry types. */
  totalRecords: number;
}

/**
 * The three lair-keystore files that make a backup CAL §4.2.1-complete: the
 * user's data PLUS the cryptographic keys to operate it. Together they let any
 * compatible Holochain conductor import the user's agent key and act as them,
 * so the user's downloadable export is genuinely self-sufficient.
 *
 * The SDK runs in browser-context and has no file-system access, so reading
 * these fields is the host app's responsibility — typically a small Tauri
 * command in Rust, or the Electron main process.
 */
export interface LairBackupFields {
  /** Plain-text passphrase that unlocks lair's `store_file`. ~32-char alphanumeric. */
  lair_passphrase: string;
  /** Full text content of `lair-keystore-config.yaml`. Contains crypto salts that MUST pair with the store_file — re-running `lair-keystore init` would generate a new config with new salts and break decryption. */
  lair_keystore_config: string;
  /** Base64 of the encrypted `store_file` bytes (lair's SQLCipher database). */
  lair_keystore_data: string;
}

/** Canonical backup payload posted to Vault. */
export interface BackupPayload {
  version: 1;
  _readme: string;
  license: 'Cryptographic Autonomy License v1.0 (CAL-1.0)';
  app: {
    name: string;
    client_id: string;
  };
  agent_pub_key: string;
  exported_at_iso: string;
  _summary: BackupSummary;
  cells: Array<{
    role_name: string;
    _readme: string;
    records: BackupRecord[];
  }>;

  /**
   * Optional: lair key fields. When present, the backup carries the user's
   * cryptographic keys alongside their data, making the downloadable export
   * CAL §4.2.1-complete (data + keys). When absent, the backup is data-only.
   *
   * See {@link LairBackupFields} for what each field is and who reads them.
   */
  lair_passphrase?: string;
  lair_keystore_config?: string;
  lair_keystore_data?: string;
}

/** Options for `dumpCellStateForBackup`. */
export interface DumpCellStateOptions {
  adminWebsocket: AdminWebsocketLike;
  /** Cell id as a 2-tuple: [dna_hash, agent_pub_key] (uint8arrays per Holochain client convention). */
  cellId: [Uint8Array, Uint8Array];
  /** Filter source-chain records to those authored by this agent. */
  agentPubKey: Uint8Array;
  /** Human-friendly role name written into the payload. */
  roleName: string;
  /**
   * Decoder called once per kept record. Returns the human_readable view.
   * The dev's match-on-entry-type lives here. Errors are caught and the record's
   * human_readable becomes a `{_warning, error}` blob so backup keeps going.
   */
  decodeRecordForExport: (
    entryType: string,
    entryBytesB64: string,
  ) => Promise<unknown>;
}

/** Result of `dumpCellStateForBackup`. */
export interface DumpCellStateResult {
  records: BackupRecord[];
  summary: BackupSummary;
}

/**
 * Convert a Uint8Array agent_pub_key into the standard `uhCAk...` base64 string.
 * Pure helper — no Holochain imports needed.
 */
function agentPubKeyToString(bytes: Uint8Array): string {
  // Holochain agent key encoding: "uhCAk" prefix + base64-of-bytes (last 3 bytes
  // are the location hash). We just use base64 standard, mirroring the conductor.
  if (typeof Buffer !== 'undefined') {
    return 'uhCAk' + Buffer.from(bytes).toString('base64');
  }
  // Browser fallback
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return 'uhCAk' + btoa(s);
}

function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Capture this user's source chain on the given cell as a list of
 * `BackupRecord`s ready to embed in a `BackupPayload.cells[]` entry.
 *
 * The user's authored records are filtered by `agentPubKey`. The decoder is
 * called once per kept record to populate the `human_readable` view; decoder
 * errors are caught (record keeps `_warning: "decode_failed"` instead).
 */
export async function dumpCellStateForBackup(
  options: DumpCellStateOptions,
): Promise<DumpCellStateResult> {
  const dump = await options.adminWebsocket.dumpFullState({
    cell_id: options.cellId,
  });

  const records: BackupRecord[] = [];
  const counts: Record<string, number> = {};

  for (const raw of dump.source_chain_dump.records) {
    // Filter to the caller's own authored records.
    const author = raw.action.author;
    if (!(author instanceof Uint8Array)) continue;
    if (!bytesEqual(author, options.agentPubKey)) continue;

    // Pull entry_type + entry bytes (may be undefined — e.g. some action types
    // have no payload, like Delete or some Update variants).
    const entryEnvelope = raw.entry;
    if (!entryEnvelope) continue;
    const entryType = entryEnvelope.entry_type || raw.action.type;
    let entryB64: string;
    if (typeof entryEnvelope.entry === 'string') {
      entryB64 = entryEnvelope.entry;
    } else if (entryEnvelope.entry instanceof Uint8Array) {
      entryB64 = uint8ToBase64(entryEnvelope.entry);
    } else {
      // No entry payload to decode — skip.
      continue;
    }

    // Run the dev's decoder; tolerate failure.
    let human: unknown;
    try {
      human = await options.decodeRecordForExport(entryType, entryB64);
    } catch (e) {
      human = {
        _warning: 'decode_failed',
        error: e instanceof Error ? e.message : String(e),
      };
    }

    const actionAddress = raw.action_address;
    const actionHashStr =
      actionAddress instanceof Uint8Array ? 'uhCkk' + uint8ToBase64(actionAddress) : String(actionAddress);

    records.push({
      entryType,
      actionHash: actionHashStr,
      createdAtMs: typeof raw.action.timestamp === 'number' ? raw.action.timestamp : 0,
      human_readable: human,
      raw_record: {
        action: raw.action,
        action_address: raw.action_address,
        signature: raw.signature,
        entry_b64: entryB64,
      },
      cellRoleName: options.roleName,
    });
    counts[entryType] = (counts[entryType] ?? 0) + 1;
  }

  return {
    records,
    summary: {
      countsByEntryType: counts,
      totalRecords: records.length,
    },
  };
}

/** Options for `restoreFromVault`. */
export interface RestoreFromVaultOptions {
  clientId: string;
  /**
   * Called once per record from the backup. Implementations typically dispatch
   * by entryType to the appropriate zome function via the app's own Tauri
   * command (e.g. `invoke("restore_record", { entryType, entryB64 })`).
   */
  dispatcher: (record: BackupRecord) => Promise<void>;
  /** Optional progress callback (current, total). */
  onProgress?: (current: number, total: number) => void;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777' */
  ipcUrl?: string;
  /** Backup label to restore. Default: 'latest'. */
  label?: string;
}

/** Result of `restoreFromVault`. */
export interface RestoreFromVaultResult {
  totalRecords: number;
  succeeded: number;
  failed: Array<{ record: BackupRecord; error: string }>;
}

// Module-level guard to detect overlapping `restoreFromVault` calls.
const _restoresInProgress: Set<string> = new Set();

/**
 * Restore an app's data from its Vault backup by walking the canonical
 * payload and calling `dispatcher` once per record. The dispatcher decides
 * how to re-create each entry (typically a zome call inside a Tauri command).
 *
 * Per-record dispatcher failures are caught; the function continues through
 * the rest of the records and surfaces failures in the returned result.
 */
export async function restoreFromVault(
  options: RestoreFromVaultOptions,
): Promise<RestoreFromVaultResult> {
  if (_restoresInProgress.has(options.clientId)) {
    throw new RestoreInProgressError();
  }
  _restoresInProgress.add(options.clientId);

  try {
    const backup = await retrieveFromVault({
      clientId: options.clientId,
      label: options.label,
      ipcUrl: options.ipcUrl,
    });
    if (!backup) {
      return { totalRecords: 0, succeeded: 0, failed: [] };
    }

    // Canonical-shape: walk cells[].records[].
    const payload = backup.data as Partial<BackupPayload> | undefined;
    const cells = payload?.cells ?? [];
    const allRecords: BackupRecord[] = [];
    for (const cell of cells) {
      for (const r of cell.records ?? []) allRecords.push(r);
    }

    const failed: RestoreFromVaultResult['failed'] = [];
    let succeeded = 0;
    for (let i = 0; i < allRecords.length; i++) {
      const r = allRecords[i];
      try {
        await options.dispatcher(r);
        succeeded++;
      } catch (e) {
        failed.push({
          record: r,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      options.onProgress?.(i + 1, allRecords.length);
    }

    return { totalRecords: allRecords.length, succeeded, failed };
  } finally {
    _restoresInProgress.delete(options.clientId);
  }
}

/** Options for the new (v2.4.0+) signature of `startAutoBackup`. */
export interface FlowstaAutoBackupConfigV2 {
  clientId: string;
  appName: string;
  adminWebsocket: AdminWebsocketLike;
  /** Single cell id today (v2.4.0). Multi-cell can grow into an array later without breaking the payload shape. */
  cellId: [Uint8Array, Uint8Array];
  cellRoleName: string;
  /** Filter source-chain records to this agent. */
  agentPubKey: Uint8Array;
  decodeRecordForExport: (
    entryType: string,
    entryBytesB64: string,
  ) => Promise<unknown>;
  /** Backup after each write (debounced). Default: true. */
  triggerOnWrite?: boolean;
  /** Debounce window for write-triggered backups, in seconds. Default: 30. */
  debounceSeconds?: number;
  /** Heartbeat interval, in minutes. 0 disables. Default: 30. */
  heartbeatMinutes?: number;
  /** Backup label. Default: 'latest' (overwrites). */
  label?: string;
  /** Vault IPC URL. Default: 'http://127.0.0.1:27777'. */
  ipcUrl?: string;
  onSuccess?: (result: FlowstaBackupResult) => void;
  onError?: (error: Error) => void;
}

/** Controller returned by the v2 `startAutoBackup` signature. */
export interface AutoBackupController {
  /** Schedule a write-triggered backup. Debounced internally. */
  triggerBackupSoon(): void;
  /** Stop all backup timers. Idempotent. */
  stop(): void;
}

function isAutoBackupConfigV2(
  config: FlowstaAutoBackupConfig | FlowstaAutoBackupConfigV2,
): config is FlowstaAutoBackupConfigV2 {
  return (config as FlowstaAutoBackupConfigV2).adminWebsocket !== undefined;
}

/**
 * Build a canonical `BackupPayload` from a single-cell dump.
 * Exported so apps can serialise to file (debug) without going through Vault.
 */
export async function buildBackupPayload(
  config: FlowstaAutoBackupConfigV2,
): Promise<BackupPayload> {
  const result = await dumpCellStateForBackup({
    adminWebsocket: config.adminWebsocket,
    cellId: config.cellId,
    agentPubKey: config.agentPubKey,
    roleName: config.cellRoleName,
    decodeRecordForExport: config.decodeRecordForExport,
  });

  return {
    version: 1,
    _readme: `Your ${config.appName} data. Backed up automatically by Flowsta Vault. Encrypted with your device key at rest; only you can read it. Each record below carries a human-readable view of what you authored AND a signed Holochain record for restore.`,
    license: 'Cryptographic Autonomy License v1.0 (CAL-1.0)',
    app: { name: config.appName, client_id: config.clientId },
    agent_pub_key: agentPubKeyToString(config.agentPubKey),
    exported_at_iso: new Date().toISOString(),
    _summary: result.summary,
    cells: [
      {
        role_name: config.cellRoleName,
        _readme:
          "Each record below is one thing you did. `human_readable` is the plain-English view of the entry. `raw_record` is the cryptographically signed Holochain record that lets any compatible app verify and restore it.",
        records: result.records,
      },
    ],
  };
}

/**
 * v2.4.0+ overload — schedules write-triggered + heartbeat auto-backups.
 *
 * Returns an `AutoBackupController` with `triggerBackupSoon()` (call this from
 * zome-write success handlers) and `stop()` (call on sign-out / unmount).
 *
 * The original `getData`-based signature still works for backwards compat.
 */
export function startAutoBackup(
  config: FlowstaAutoBackupConfigV2,
): AutoBackupController;
export function startAutoBackup(config: FlowstaAutoBackupConfig): () => void;
export function startAutoBackup(
  config: FlowstaAutoBackupConfig | FlowstaAutoBackupConfigV2,
): AutoBackupController | (() => void) {
  if (!isAutoBackupConfigV2(config)) {
    return startAutoBackupLegacy(config);
  }

  const v2 = config;
  const debounceMs = (v2.debounceSeconds ?? 30) * 1000;
  const heartbeatMs = (v2.heartbeatMinutes ?? 30) * 60 * 1000;
  const triggerOnWrite = v2.triggerOnWrite ?? true;

  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let lastBackupAt = 0;
  let writesSinceLastBackup = 0;

  const doBackup = async () => {
    if (stopped) return;
    try {
      const status = await getVaultStatus(v2.ipcUrl);
      if (!status.running) return;
      const payload = await buildBackupPayload(v2);
      const result = await backupToVault(
        {
          clientId: v2.clientId,
          appName: v2.appName,
          label: v2.label,
          ipcUrl: v2.ipcUrl,
        },
        payload,
      );
      lastBackupAt = Date.now();
      writesSinceLastBackup = 0;
      v2.onSuccess?.(result);
    } catch (err) {
      v2.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const controller: AutoBackupController = {
    triggerBackupSoon() {
      if (stopped) return;
      if (!triggerOnWrite) return;
      writesSinceLastBackup++;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doBackup, debounceMs);
    },
    stop() {
      stopped = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  };

  if (heartbeatMs > 0) {
    heartbeatTimer = setInterval(() => {
      if (stopped) return;
      // Heartbeat: only run if there's been a write since the last backup,
      // or if no backup has ever happened in this session.
      if (writesSinceLastBackup === 0 && lastBackupAt > 0) return;
      doBackup();
    }, heartbeatMs);
  }

  // Initial backup on startup.
  doBackup();

  return controller;
}

/** Original (v2.3.0) signature, preserved for backwards compatibility. */
function startAutoBackupLegacy(config: FlowstaAutoBackupConfig): () => void {
  const intervalMs = (config.intervalMinutes ?? 60) * 60 * 1000;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const doBackup = async () => {
    if (stopped) return;
    try {
      const status = await getVaultStatus(config.ipcUrl);
      if (!status.running) return;
      const data = await config.getData();
      const result = await backupToVault(
        {
          clientId: config.clientId,
          appName: config.appName,
          label: config.label,
          ipcUrl: config.ipcUrl,
        },
        data,
      );
      config.onSuccess?.(result);
    } catch (err) {
      config.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  doBackup();
  if (intervalMs > 0) timer = setInterval(doBackup, intervalMs);

  return () => {
    stopped = true;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}
