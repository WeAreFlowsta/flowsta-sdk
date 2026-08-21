# @flowsta/holochain

Link your Holochain app's agent key with the user's Flowsta Vault identity, then get encrypted backups, reinstall recovery, document signing, and a [Cryptographic Autonomy License](https://github.com/holochain/cryptographic-autonomy-license)-compliant user data export for free.

## Overview

Flowsta Vault acts as a local identity provider (like MetaMask for Ethereum) for Holochain apps. This SDK lets you:

- **Link identity** — request a signed identity attestation from the Vault via IPC and commit it to your DHT using the [`flowsta-agent-linking`](https://github.com/WeAreFlowsta/flowsta-agent-linking) Rust crate. Anyone on your DHT can verify the user's Flowsta identity purely via Ed25519 cryptography.
- **Read user profile** — display name, profile picture, and unique username from `getVaultStatus()`, scope-gated. No signup forms or avatar uploads needed.
- **Auto-backup + reinstall recovery (v2.4.0+)** — canonical-shape backups with a dispatcher pattern for restore. One small `match` per entry type covers both sides forever.
- **CAL §4.2.1 data export** — the Vault's "Download Export" produces a portable JSON file with the user's cryptographic keys and your app's records in plain English. The export every CAL-licensed Holochain app must provide; you write nothing.
- **Document signing** — `signDocument()` over Vault IPC.

**No shared DNA or API dependency required for identity linking.** Anyone on your DHT can verify the user's Flowsta identity purely via Ed25519 cryptography.

Full docs: [docs.flowsta.com/sdk/holochain](https://docs.flowsta.com/sdk/holochain) • [Why integrate Flowsta](https://docs.flowsta.com/getting-started/why-flowsta) • [Backups & Reinstall Recovery](https://docs.flowsta.com/sdk/holochain#backups)

## Migrating to v3

v3 makes wrong-identity and error states impossible to mistake for "no data". Two changes can break existing code:

1. **`retrieveFromVault` / `restoreFromVault` now throw where they returned `null` / `{totalRecords: 0}`.** A `null` from `retrieveFromVault` (and a zero-record restore) now means a CONFIRMED absent backup and nothing else. An unreachable Vault throws `VaultNotFoundError`, a locked Vault `VaultLockedError`, a backup belonging to a different identity `IdentityMismatchError`, an unreadable backup `FlowstaHolochainError`. Previously all of these read as "no backup", which made a restore against an offline or wrong-identity Vault report success. If you probed for optional backups with a bare `retrieveFromVault`, check `getVaultStatus()` first or catch these errors.
2. **`backupToVault` refuses two dangerous writes by default.** An empty canonical payload that would replace a non-empty backup throws `EmptyBackupSkippedError` (previously only `startAutoBackup` had this guard; pass `protectNonEmpty: false` to opt out). And when an identity is bound (see below), a Vault holding a different identity throws `IdentityMismatchError`.

New in v3, no code needed:

- **Identity binding** — `linkFlowstaIdentity` records the Vault identity it linked with (persisted in `localStorage` where available), and the write-shaped calls - `backupToVault`, `signDocument`, `authenticateWithVault` - refuse on a definite mismatch. `retrieveFromVault` relies on the Vault's own 409 answer instead (older Vaults without that response can't flag wrong-identity reads). `bindVaultIdentity()` / `getBoundIdentity()` / `clearBoundIdentity()` are exported for apps that manage links themselves, `onIdentityChanged(cb)` polls for Vault account switches (UX only - the asserting calls check independently), and `agentKeysMatch(a, b)` compares agent keys across their base64url and base58 encodings.
- **Port sweep** — when no `ipcUrl` is given, calls resolve the Vault across ports 27777-27779 instead of assuming 27777 (a second Vault instance shifts ports; "absent" used to fail open).

## Installation

```bash
npm install @flowsta/holochain
```

You also need the `flowsta-agent-linking` Rust crate in your DNA. See [Integration Guide](#integration-guide) below.

## Quick Start

```typescript
import { linkFlowstaIdentity } from '@flowsta/holochain';

// 1. Request identity link from Vault
const result = await linkFlowstaIdentity({
  appName: 'ChessChain',
  clientId: 'flowsta_app_abc123...', // from dev.flowsta.com
  localAgentPubKey: myAgentKey,      // uhCAk... format
});

// 2. Commit attestation to your DHT
await appWebsocket.callZome({
  role_name: 'chess',
  zome_name: 'agent_linking',
  fn_name: 'create_external_link',
  payload: {
    external_agent: decodeHashFromBase64(result.payload.vaultAgentPubKey),
    external_signature: base64ToSignature(result.payload.vaultSignature),
  },
});
```

## API Reference

### `linkFlowstaIdentity(options)`

Request an agent-linking signature from Flowsta Vault. Shows an approval dialog to the user.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `appName` | `string` | Yes | Shown in Vault approval dialog |
| `clientId` | `string` | Yes | From dev.flowsta.com |
| `localAgentPubKey` | `string` | Yes | Your agent's pubkey (`uhCAk...` format) |
| `ipcUrl` | `string` | No | Default: sweeps `127.0.0.1:27777-27779` for the Vault (v3) |

Returns `{ success: true, payload: { vaultAgentPubKey, vaultSignature } }`.

### `getFlowstaIdentity(options)`

Query linked Flowsta identities for an agent on your DHT.

```typescript
const linked = await getFlowstaIdentity({
  appWebsocket,
  roleName: 'chess',
  agentPubKey: myAgentKey, // Uint8Array
});
```

### `backupToVault(options, data)`

Store app data in the user's Vault for backup/portability. Works even when the Vault is locked (after first unlock in the session). Each call without a `label` creates a new timestamped snapshot (max 10 per app, oldest auto-rotated). Pass `label: "latest"` to overwrite a single backup.

```typescript
import { backupToVault } from '@flowsta/holochain';

await backupToVault(
  { clientId: 'flowsta_app_abc123...', appName: 'ChessChain', label: 'latest' },
  { games: [...], settings: {...} },
);
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | `string` | Yes | From dev.flowsta.com |
| `appName` | `string` | Yes | Shown in Vault UI |
| `label` | `string` | No | Named backup (overwrites same label). Omit for auto-versioned snapshots |
| `contentType` | `string` | No | Default: `application/json` |
| `protectNonEmpty` | `boolean` | No | Default: `true` (v3). Refuse to replace a non-empty backup with an empty canonical payload - throws `EmptyBackupSkippedError` |
| `ipcUrl` | `string` | No | Default: sweeps `127.0.0.1:27777-27779` for the Vault (v3) |

Throws `EmptyBackupSkippedError` on a refused empty overwrite (see `protectNonEmpty`) and `IdentityMismatchError` when a bound identity doesn't match the Vault's.

### `startAutoBackup(config)` _(canonical-shape, v2.4.0+)_

Automatically back up the user's source chain to the Vault as canonical-shape payloads. The Vault recognises this shape and unlocks per-entry-type counts on its Your Data page ("12 polls, 38 votes") + inlines a human-readable view of each record into the user's CAL §4.2.1 data export.

Two signatures — both still supported:

**v2.4.0+ canonical-shape (recommended).** Pass an `AdminWebsocket` + a per-entry-type decoder. Returns an `AutoBackupController { triggerBackupSoon(), stop() }`.

```typescript
import { startAutoBackup } from '@flowsta/holochain';
import { invoke } from '@tauri-apps/api/core';

const controller = startAutoBackup({
  clientId: 'flowsta_app_abc123...',
  appName: 'ChessChain',
  adminWebsocket: adminWs,                  // your AdminWebsocket instance
  cellId: gamesCellId,                      // [DnaHash, AgentPubKey] tuple
  cellRoleName: 'games',
  agentPubKey: myAgentBytes,                // filter source chain to user's authored records
  decodeRecordForExport: (entryType, entryB64) =>
    invoke('decode_record_for_export', { entryType, entryBytesB64: entryB64 }),
  triggerOnWrite: true,                     // default; debounce 30s
  heartbeatMinutes: 30,                     // default; safety-net retry
  label: 'latest',                          // default; single overwriting backup
  onSuccess: (r) => console.log(`Backed up ${r.dataSize} bytes`),
  onError: (e) => console.warn('Backup skipped:', e.message),
});

// Call after each successful zome write to debounce-trigger a backup:
controller.triggerBackupSoon();

// On sign-out / app close:
controller.stop();
```

You provide one Tauri command, `decode_record_for_export`, with one `match` arm per entry type. Each arm decodes the entry's MessagePack bytes with `rmp_serde::from_slice` and converts to JSON via `serde_json::to_value(struct)` — leveraging the existing `#[derive(Serialize)]` on your entry structs. See [docs.flowsta.com/sdk/holochain#backups](https://docs.flowsta.com/sdk/holochain#backups) for the full code.

**Non-empty backup protection (on by default; guards every write since v3).** Auto-backup fires immediately on start — including the first start after a reinstall or on a new device, when the source chain is still empty but the user's Vault holds their real backup. Writing that empty payload would destroy the Vault copy (records AND any keys the payload carries) before the user has recovered anything. Since v3 the guard lives inside `backupToVault` itself, so EVERY write is protected — auto-backup, direct calls, everything: a canonical payload with zero user records that would replace a non-empty backup throws `EmptyBackupSkippedError` (code `empty_backup_skipped`); in `startAutoBackup` it arrives via `onError` so you can tell the skip apart from a real failure. The next non-empty backup writes normally. Set `protectNonEmpty: false` only if your app intentionally writes empty canonical payloads. `wouldOverwriteNonEmptyBackup(options, payload)` remains exported for apps that want the probe's answer without attempting a write.

**Legacy `getData` signature (backwards-compatible).** Pass a `getData()` callback that returns the backup data directly. Returns a `stop()` function. Use this for apps that build the payload themselves on the Rust side (see [the Rust-side alternative](https://docs.flowsta.com/sdk/holochain#rust-side-alternative-for-app-websocket-apps) in the docs):

```typescript
const stop = startAutoBackup({
  clientId: 'flowsta_app_abc123...',
  appName: 'ChessChain',
  intervalMinutes: 60,
  getData: () => invoke('build_canonical_backup'),
  onSuccess: (r) => console.log(`Backed up ${r.dataSize} bytes`),
  onError: (e) => console.warn('Backup skipped:', e.message),
});

stop();
```

### `restoreFromVault(options)` _(2.4.0+)_

Walk a Vault backup and call a dispatcher once per record — used to restore data on a fresh install. Per-record failures are caught; the function continues through the remaining records and returns a `{ totalRecords, succeeded, failed }` summary.

```typescript
import { restoreFromVault, listVaultBackups } from '@flowsta/holochain';

const backups = await listVaultBackups();
const ours = backups.apps.find(a => a.clientId === clientId);
if (ours && ours.backupCount > 0 && /* local source chain is empty */) {
  const result = await restoreFromVault({
    clientId,
    dispatcher: async (record) => {
      // record: { entryType, actionHash, createdAtMs, human_readable, raw_record, cellRoleName }
      await invoke('restore_record', {
        entryType: record.entryType,
        entryBytesB64: record.raw_record.entry_b64,
      });
    },
    onProgress: (current, total) => updateProgressUI(current, total),
  });
  console.log(`Restored ${result.succeeded}/${result.totalRecords}`);
}
```

On the Rust side, `restore_record` is the symmetric `match` — decode the entry, then call the matching zome function.

### CAL §4.2.1 — keys come from the Vault, not the backup _(2.4.0+)_

A `BackupPayload` carries **data only**. It does not — and should not — carry the user's cryptographic keys: their identity lives in their Flowsta Vault, and your app never holds the key material.

CAL §4.2.1 (the user's data **plus** the keys to operate it) is satisfied at the Vault level. The Vault's "Export All Data" bundles the user's data **plus the device seed** — the key material their 24-word recovery phrase derives — so the export is self-sufficient: they can re-derive their identity on any compatible Holochain conductor and use their data, with no lock-in.

To get a user's data back on a new device the recommended path is **recognition**: they sign in with their Flowsta identity, the Vault recognises their agent set, and their on-network data re-syncs from the DHT — no replay or key import. (`restoreFromVault` above remains available if your app wants to explicitly replay its backed-up records onto a fresh source chain instead.)

### `dumpCellStateForBackup(options)` _(2.4.0+)_

Build a canonical-shape `records[]` array from a Holochain admin `dumpFullState` call. Used internally by `startAutoBackup`'s v2.4 signature; exposed so apps can serialise to file (debug) or transform before posting:

```typescript
import { dumpCellStateForBackup } from '@flowsta/holochain';

const { records, summary } = await dumpCellStateForBackup({
  adminWebsocket: adminWs,
  cellId: gamesCellId,
  agentPubKey: myAgentBytes,
  roleName: 'games',
  decodeRecordForExport: (entryType, entryB64) =>
    invoke('decode_record_for_export', { entryType, entryBytesB64: entryB64 }),
});
```

### `getVaultStatus(ipcUrl?)`

Check if Flowsta Vault is running and unlocked. When the vault is unlocked, the returned `VaultStatus` carries the currently-active account's profile fields so you can render a `Signed in as ${displayName}` chip without hitting `/status` directly:

- `displayName` _(2.3.0+)_ — scope-gated by `display_name`
- `profilePicture` _(2.3.0+)_ — scope-gated by `profile_picture`
- `webUsername` _(2.4.1+)_ — scope-gated by `username`

Scopes are configured per `client_id` at [dev.flowsta.com](https://dev.flowsta.com); the user approves them once at link time. Fields are `undefined` until granted.

```typescript
const status = await getVaultStatus();
if (status.blocked) {
  // 3.1.0: the BROWSER refused the loopback request (Chrome's Local
  // Network Access permission). The Vault may be running - point the user
  // at the browser's site settings, or offer relay login. Never "install".
} else if (!status.running) {
  // Prompt user to open Flowsta Vault
} else if (status.unlocked) {
  console.log(`Signed in as ${status.displayName ?? 'Flowsta Account'}`);
  if (status.webUsername) console.log(`@${status.webUsername}`);
}
```

### Which browsers reach the Vault _(verified 2026-08)_

Every loopback call here targets `http://127.0.0.1` from your page. Who lets that through:

| Browser | Reaches the Vault? | What to do |
|---|---|---|
| Chrome / Edge / other Chromium | **Yes, behind a permission** - Chrome 142+ asks "Look for and connect to any device on your local network" on the first request (Chrome 145+: "Apps on device"). | Nothing special to send; a denial surfaces as `status.blocked` / `VaultBlockedError` - show the settings path, not "install the Vault" |
| Firefox | **Yes** (loopback exempt from mixed-content blocking since Firefox 55; its own Local Network Access check currently auto-allows) | Direct path |
| Safari | **No** (WebKit treats loopback as mixed content) | `startRelayLogin` + `openVaultDeepLink` |
| Brave | **No** unless the site is on Brave's allowlist (silent block; `navigator.brave.isBrave()` detects it) | Relay, or tell the user about `brave://settings/content/localhostAccess` |
| Phones | No Vault on the device | `startRelayLogin` (typed code) |
| Desktop apps (Tauri/Electron) | Yes | Direct path |

`loopbackPermissionState()` _(3.1.0)_ returns `'granted' | 'denied' | 'prompt' | 'unknown'` if you want to explain the prompt before it appears.

### `getFlowstaLinkStatus(options)` _(2.3.0)_

Returns the canonical three-state link status. This is the recommended
replacement for `checkFlowstaLinkStatus` — the old boolean conflated
"Vault running, doesn't recognise this app's agent" and "Vault not
running right now", which led apps to silently revoke users when the
Vault was simply closed.

```typescript
import { getFlowstaLinkStatus } from '@flowsta/holochain';

const status = await getFlowstaLinkStatus({
  clientId: import.meta.env.VITE_FLOWSTA_CLIENT_ID,
  localAgentPubKey: myAgentKey,
});

switch (status.state) {
  case 'linked':
    // Vault is running and recognises this app's agent. Full access.
    break;
  case 'unlinked':
    // Vault is running but doesn't recognise this app's agent — the
    // user unlinked from Vault's UI, switched Flowsta accounts, or
    // restored a fresh Vault from a different recovery phrase. Surface
    // a "reconnect or disconnect" prompt rather than silently revoking.
    break;
  case 'offline':
    // Vault not reachable. Trust local link state as authoritative —
    // the Vault may simply be closed.
    break;
}
```

The recommended UX pattern: render a top-of-page banner when state is
`unlinked`, explaining the mismatch and offering "Reconnect" (re-link
with the current Vault account) or "Disconnect" (deliberately revoke).
Never auto-revoke on `unlinked` — past data created against the local
agent stays the user's regardless of their Vault link choice.

ProofPoll has the reference implementation: see
[ProofPoll/src/lib/context.ts](https://github.com/WeAreFlowsta/ProofPoll/blob/main/src/lib/context.ts)
and [ProofPoll/src/routes/layout.tsx](https://github.com/WeAreFlowsta/ProofPoll/blob/main/src/routes/layout.tsx)
for the layout-level banner + greyed-out profile chip pattern.

### `revokeFlowstaIdentity(options)`

Notify Vault that a link was revoked (best-effort, won't throw if Vault is offline).

### `checkFlowstaLinkStatus(options)` _(deprecated — use `getFlowstaLinkStatus`)_

Returns a `{ linked: boolean }` indicating whether Vault still recognises
the agent. Kept for backwards compatibility; new code should use
`getFlowstaLinkStatus` to distinguish the offline state from a genuine
unlink.

### `signDocument(options)`

Ask the Vault to sign a file hash. The user sees an approval dialog showing your app name and the file's label + hash. If they approve, the Vault signs with their Ed25519 device key and (if the signing DNA is installed) commits a `SignatureRecord` to the DHT.

```typescript
import { signDocument } from '@flowsta/holochain';

const result = await signDocument({
  clientId: 'your_flowsta_app_client_id',
  appName: 'My Desktop App',
  fileHash: 'a7f3b9c1e2d4...', // SHA-256 hex
  label: 'Report.pdf',
  intent: 'authorship',
  aiGeneration: 'none',
  contentRights: {
    license: 'cc-by',
    aiTraining: 'not_allowed',
    contactPreference: 'allow_contact_requests',
  },
});

console.log(result.signature);    // Base64 Ed25519 signature
console.log(result.agentPubKey);  // uhCAk... agent pub key
console.log(result.actionHash);   // DHT action hash (or null)
```

Throws:
- `VaultNotFoundError` — Vault isn't running
- `VaultLockedError` — Vault is running but locked
- `UserDeniedError` — User rejected the request
- `SigningDnaNotInstalledError` — Vault is too old
- `IdentityMismatchError` — the Vault holds a different identity than the one this app is bound to (v3)

Your app must be linked in the Vault (via `linkFlowstaIdentity`) and origin-stable across calls — `/sign-document` is gated on caller origin matching a linked app.

### `getSigningStatus(ipcUrl?)`

Lightweight check to decide whether to render a "Sign with Flowsta" button.

```typescript
const status = await getSigningStatus();
if (status.available) {
  // Show the sign button
}
```

Returns `{ available, vaultRunning, vaultUnlocked }`. Does **not** prompt the user or require an approval.

## Error Handling

| Error | When | Suggested UX |
|-------|------|--------------|
| `VaultNotFoundError` | Vault not running | "Install or start Flowsta Vault" |
| `VaultBlockedError` _(3.1.0)_ | The browser refused the loopback request (Local Network Access permission denied; Brave's localhost block). The Vault may be running. | "Allow this site to reach apps on your device in the browser's site settings" - or offer relay login. Never "install the Vault" |
| `VaultLockedError` | Vault is locked | "Please unlock your Flowsta Vault" |
| `UserDeniedError` | User rejected dialog | "Identity linking cancelled" |
| `InvalidClientIdError` | Bad client_id | "App not registered at dev.flowsta.com" |
| `MissingClientIdError` | No client_id | Developer error |
| `ApiUnreachableError` | Can't verify app | "Check internet connection" |
| `BackupTooLargeError` _(2.4.0)_ | Payload exceeds Vault's 50 MB per-app limit | "Backup too large — try clearing old entries" |
| `DispatcherFailedError` _(2.4.0)_ | A `restoreFromVault` dispatcher threw on a record | Surface in the restore summary; offer retry |
| `RestoreInProgressError` _(2.4.0)_ | Concurrent `restoreFromVault` calls collided | Disable the restore button while one is running |
| `DecodeFailedError` _(2.4.0)_ | `decodeRecordForExport` threw on an entry | Backup continues; record carries `_warning: "decode_failed"` |
| `EmptyBackupSkippedError` _(3.0.0: every write; introduced 2.6.0)_ | A backup write was refused: an empty payload would overwrite a non-empty Vault backup | Not a failure — finish recovery; the next non-empty backup writes normally |
| `IdentityMismatchError` _(3.0.0)_ | The Vault's active identity differs from the one this app is bound to (writes), or a backup doesn't decrypt under the active identity (reads, Vault 409) | "Unlock the matching Vault, or sign in again" |

```typescript
import { linkFlowstaIdentity, VaultNotFoundError, UserDeniedError } from '@flowsta/holochain';

try {
  const result = await linkFlowstaIdentity({ ... });
} catch (error) {
  if (error instanceof VaultNotFoundError) {
    showMessage('Please install and open Flowsta Vault');
  } else if (error instanceof UserDeniedError) {
    showMessage('Identity linking was cancelled');
  }
}
```

## Integration Guide

### 1. Add zomes to your DNA

```toml
# integrity Cargo.toml
[dependencies]
flowsta-agent-linking-integrity = { git = "https://github.com/WeAreFlowsta/flowsta-agent-linking" }

# coordinator Cargo.toml
[dependencies]
flowsta-agent-linking-coordinator = { git = "https://github.com/WeAreFlowsta/flowsta-agent-linking" }
```

```yaml
# dna.yaml
integrity:
  zomes:
    - name: agent_linking_integrity
      bundled: ../../target/.../flowsta_agent_linking_integrity.wasm
coordinator:
  zomes:
    - name: agent_linking
      bundled: ../../target/.../flowsta_agent_linking_coordinator.wasm
      dependencies:
        - name: agent_linking_integrity
```

### 2. Install SDK

```bash
npm install @flowsta/holochain
```

### 3. Register your app

Register at [dev.flowsta.com](https://dev.flowsta.com) to get a `client_id`.

### 4. Link and query

See [Quick Start](#quick-start) above.

## License

MIT
