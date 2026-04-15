# @flowsta/holochain

Link your Holochain app's agent key with the user's Flowsta Vault identity.

## Overview

Flowsta Vault acts as a local identity provider (like MetaMask for Ethereum) for Holochain apps. This SDK lets you request a signed identity attestation from the Vault via IPC, then commit it to your own DHT using the `flowsta-agent-linking` Rust crate.

**No shared DNA or API dependency required.** Anyone on your DHT can verify the user's Flowsta identity purely via Ed25519 cryptography.

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

Store app data in the user's Vault for backup/portability. Works even when the Vault is locked (after first unlock in the session). Each call without a `label` creates a new timestamped snapshot (max 10 per app, oldest auto-rotated).

```typescript
import { backupToVault } from '@flowsta/holochain';

await backupToVault(
  { clientId: 'flowsta_app_abc123...', appName: 'ChessChain' },
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

### `startAutoBackup(config)`

Periodically back up app data to the Vault. Returns a `stop()` function.

```typescript
import { startAutoBackup } from '@flowsta/holochain';

const stop = startAutoBackup({
  clientId: 'flowsta_app_abc123...',
  appName: 'ChessChain',
  intervalMinutes: 60,
  getData: () => myApp.exportAllData(),
  onSuccess: (r) => console.log(`Backed up ${r.dataSize} bytes`),
  onError: (e) => console.warn('Backup skipped:', e.message),
});

// Later, to stop:
stop();
```

### `getVaultStatus(ipcUrl?)`

Check if Flowsta Vault is running and unlocked.

```typescript
const status = await getVaultStatus();
if (!status.running) {
  // Prompt user to open Flowsta Vault
}
```

### `revokeFlowstaIdentity(options)`

Notify Vault that a link was revoked (best-effort, won't throw if Vault is offline).

### `checkFlowstaLinkStatus(options)`

Check if Vault still considers an agent linked (detects vault-side revocation).

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
