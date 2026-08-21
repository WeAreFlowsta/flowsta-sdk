# Changelog

## 3.1.0

- Browser-blocked is no longer mistaken for not-running. Chrome 142+ gates a public page's requests to `127.0.0.1` behind a Local Network Access permission, and a denial used to look exactly like an absent Vault. `getVaultStatus` now returns `blocked: true` in that case, `requireUnlockedVault` (so `signDocument`, `authenticateWithVault`, `linkFlowstaIdentity`, backups) throws the new `VaultBlockedError` (`vault_blocked`) instead of `VaultNotFoundError`, and `loopbackPermissionState()` is exported for apps that want to explain the prompt up front.
- Vault probes declare `targetAddressSpace: 'loopback'` so https pages stay exempt from mixed-content checks under Chrome's rules.
- README gains a verified browser-reach table: Firefox reaches the Vault directly (the earlier "Firefox/Safari use relay" note was wrong); Safari, Brave and phones use the relay.

## 3.0.0

**Breaking.** Wrong-identity and error states can no longer be mistaken for "no data". See [Migrating to v3](./README.md#migrating-to-v3) in the README.

- `retrieveFromVault` / `restoreFromVault` throw where they returned `null` / `{totalRecords: 0}`: unreachable Vault → `VaultNotFoundError`, locked → `VaultLockedError`, backup belonging to a different identity → `IdentityMismatchError` (new class), unreadable → `FlowstaHolochainError`. `null` / zero records now means CONFIRMED absent, nothing else.
- `backupToVault` refuses two dangerous writes by default: an empty canonical payload replacing a non-empty backup (`EmptyBackupSkippedError`; the guard moved here from `startAutoBackup`, so every write is protected - `protectNonEmpty: false` opts out), and a write while the Vault holds a different identity than the bound one (`IdentityMismatchError`).
- Identity binding: `linkFlowstaIdentity` records the Vault identity it linked with; `backupToVault`, `signDocument`, and `authenticateWithVault` refuse on a definite mismatch. New exports: `bindVaultIdentity`, `getBoundIdentity`, `clearBoundIdentity`, `agentKeysMatch`, `onIdentityChanged`.
- Port sweep: with no `ipcUrl`, calls resolve the Vault across ports 27777-27779 (`resolveVaultUrl` exported) instead of assuming 27777.

## 2.6.0

- `startAutoBackup` never replaces a non-empty Vault backup with an empty payload (`protectNonEmpty`, on by default; `EmptyBackupSkippedError` via `onError`; `wouldOverwriteNonEmptyBackup` exported for direct posts).

## 2.5.0

- Multi-cell backups (`additionalCells`); typed errors wired: `BackupTooLargeError` on the Vault's 50 MB limit, `DispatcherFailedError` on total restore failure; restore re-authoring documented.

## 2.4.x

- 2.4.4: removed vestigial lair backup fields - CAL key material is the device seed / recovery phrase; restore is recognition.
- 2.4.0: canonical-shape backups (`startAutoBackup` V2 signature with write-triggered + heartbeat backups), `restoreFromVault`, `dumpCellStateForBackup`, `buildBackupPayload`.

## 2.3.0

- Rich link status (`getFlowstaLinkStatus`), enriched `VaultStatus`.

## 2.2.0

- Sign It document signing (`signDocument`, `getSigningStatus`).
