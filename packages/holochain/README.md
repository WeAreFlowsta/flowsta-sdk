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
| `ipcUrl` | `string` | No | Default: `http://127.0.0.1:27777` |

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
| `ipcUrl` | `string` | No | Default: `http://127.0.0.1:27777` |

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

### CAL-complete backups: data + keys _(2.4.3+)_

A canonical `BackupPayload` can optionally carry the user's lair-keystore key material alongside their records, via three fields — `lair_passphrase`, `lair_keystore_config`, and `lair_keystore_data` (see the `LairBackupFields` type). When present, the backup is **CAL §4.2.1-complete**: it holds the user's _data plus the cryptographic keys to operate it_, so the downloadable export is self-sufficient on any compatible Holochain conductor — no lock-in.

The SDK runs in browser context with no file-system access, so reading these three lair files is the **host app's** job — typically a small Tauri command in Rust (or the Electron main process). When the fields are absent, the backup is data-only.

> These fields exist for **portability**, not auto-restore. In practice a user recovers their identity from their 24-word recovery phrase and their on-network data re-syncs from the DHT; the lair material makes the _exported file_ independently complete, as CAL requires.

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
if (!status.running) {
  // Prompt user to open Flowsta Vault
} else if (status.unlocked) {
  console.log(`Signed in as ${status.displayName ?? 'Flowsta Account'}`);
  if (status.webUsername) console.log(`@${status.webUsername}`);
}
```

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
| `VaultLockedError` | Vault is locked | "Please unlock your Flowsta Vault" |
| `UserDeniedError` | User rejected dialog | "Identity linking cancelled" |
| `InvalidClientIdError` | Bad client_id | "App not registered at dev.flowsta.com" |
| `MissingClientIdError` | No client_id | Developer error |
| `ApiUnreachableError` | Can't verify app | "Check internet connection" |
| `BackupTooLargeError` _(2.4.0)_ | Payload exceeds Vault's 50 MB per-app limit | "Backup too large — try clearing old entries" |
| `DispatcherFailedError` _(2.4.0)_ | A `restoreFromVault` dispatcher threw on a record | Surface in the restore summary; offer retry |
| `RestoreInProgressError` _(2.4.0)_ | Concurrent `restoreFromVault` calls collided | Disable the restore button while one is running |
| `DecodeFailedError` _(2.4.0)_ | `decodeRecordForExport` threw on an entry | Backup continues; record carries `_warning: "decode_failed"` |

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
