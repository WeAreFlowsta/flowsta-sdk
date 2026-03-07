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
