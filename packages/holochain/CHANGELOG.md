# Changelog

## 3.8.0

Additive. Pairs with Flowsta Vault 1.6.1; older Vaults answer the new call with "not available" and ignore the new option.

- `getAppSecret({ label })`: a 32-byte secret for this app and label that is the same on every one of the person's devices - the Vault derives it from the identity seed, scoped to the app. `null` on an older Vault.
- `getAppNetworkSecret({ clientId, appName, label? })`: one private-network secret per identity per app, in an order that never changes a secret an identity already has (this device's backup, another device's, the derived one, a random one written to the slot). Use it as the DNA's `network_seed` so an app installed on several devices with the same identity shares one private network.
- `retrieveFromVault({ across: 'devices', device })`: the copy held from one named device (an id from `listVaultBackups().otherDevices`) instead of the newest - to read every sibling's copy of a per-device label.

## 3.7.0

Additive. Pairs with Flowsta Vault 1.6.0, where a person's identity can live on several devices; older Vaults ignore the new option and omit the new fields.

- `retrieveFromVault({ across: 'devices' })` returns the newest backup with that label on any of the person's devices, and `fromDevice` says which device wrote it (`null` for this one). Without the option the call returns this device's own backup, as before: an app on a second device starts as a fresh install there.
- `listVaultBackups` returns `otherDevices` (for each other device, the labels it holds for this app) when there are any.

## 3.6.1

- `signDocument`: an `identity_mismatch` refusal now carries the Vault's description as the error message and the bound identity as `expected` (3.6.0 put the description in `expected`).
- JSDoc: `ipcUrl` defaults describe the 3.4.0 resolver (probe 27777-27779) instead of a single port.

## 3.6.0

- `signDocument` publishes the signature to the Sign It network from the person's own device when the app is bound to an identity (it linked through `linkFlowstaIdentity`). Before 3.6.0 the SDK never asked the Vault to publish, so every SDK-made signature stayed local with `actionHash: null` and could not be verified. New option `publish` (default: bound), new result field `published`, new errors `PublishForbiddenError` (`tier_forbidden`: only Flowsta pages and linked apps may publish) and `QuotaExceededError` (`quota_exceeded`); `IdentityMismatchError` is now thrown from `signDocument` too.
- Backups: the documented default label `latest` is applied when no label is given (`backupToVault`, `retrieveFromVault`, `restoreFromVault`, `startAutoBackup` entries). Before, an unlabeled write produced a new snapshot each time and restore relied on the Vault picking the newest.
- `getVaultStatus` returns `did` (the Permanent ID) when the Vault reports it.
- `SigningDnaNotInstalledError` is deprecated: the Vault never emits that code, so it was never thrown. Removed in 4.0.

## 3.5.0

Additive. Pairs with Flowsta Vault 1.5.0 (the identity switcher); older Vaults simply omit the new fields.

- `getVaultStatus` returns `activeIdentity` (the identity the Vault holds, unlocked OR locked), `identityEpoch` (counts every identity change on that device) and `instanceId` (the answering Vault process).
- `resolveVaultUrl` ranks a locked Vault that holds the identity this app is bound to above an unlocked Vault holding someone else: loopback ports are shared by every user account on a computer, and the unlocked one may not be this person's.
- `onIdentityChanged` compares `identityEpoch` when the Vault reports it: A→B→A between two polls is still a change, and a switch is seen through a locked Vault. Key comparison stays for older Vaults.
- `getFlowstaLinkStatus` and `listVaultBackups` send `expected_identity` in the query string when the app is bound, like the POST calls send it in the body; a Vault under a different identity refuses them (1.5.0 checks GET queries too).

## 3.4.0

Additive. Groundwork for Vault 1.5.0 (the identity switcher); works with every 1.x Vault.

- `resolveVaultUrl` probes 27777-27779 in parallel on every call and picks the best answer: unlocked under the identity this app is bound to, then unlocked, then initialized, then any - the first port that answered used to win, so a locked (or another OS user's) Vault on 27777 hid the right one on 27778.
- `signDocument` and `authenticateWithVault` send `expected_identity` like the backup calls have since 3.0.0; a Vault under a different identity refuses them instead of signing as the wrong person.
- `onIdentityChanged` starts from the bound identity, so an app that opens against a Vault already switched hears about it on the first tick.
- `getVaultIdentity()` - the unlocked agent key or null, one status read.
- `reconnectIdentity({ clientId, localAgentPubKey })` - after a switch: rebinds silently when the new identity already holds a link for this app, or answers `approval_needed` so the app runs `linkFlowstaIdentity`; `locked` / `offline` leave the binding alone.

## 3.3.0

Additive.

- `partitionKeyFor(agentPubKey)` - the folder-safe key the Flowsta apps use to keep one identity's data apart from another's (first 16 hex chars of SHA-256 over the agent key's 39 raw bytes; the same for the base64url and base58 spellings, and the same key the Vault, ProofPoll and Your Own AI use for their own per-identity folders). `PARTITION_KEY_LENGTH` exported. Use it to name per-identity storage instead of writing the agent key into a name.
- `getBoundIdentity()` is documented as what it always was: one slot per origin, the identity the app operates under now, overwritten by the next `linkFlowstaIdentity`. Apps holding data for several identities key that data by `partitionKeyFor` and treat the binding as the pointer to the active one.
- The `expected_identity` comment in `backupToVault` no longer calls the Vault's gate forward-compatible: the Vault (1.3.0+) refuses a write under a different active identity server-side.

## 3.2.0

Additive; pairs with Flowsta Vault 1.3.0 (older Vaults simply omit the new fields).

- `authenticateWithVault` takes `clientId` + `scopes`. With `scopes: ['email']` the Vault's sign-in dialog shows the user the address that will be shared and states that your app receives it as text it can keep; if they allow, the result carries `email` + `emailVerified: true`, and the Vault files the same grant with Flowsta so `/oauth/userinfo` agrees. Only a verified address is ever offered; scopes your app is not registered for are ignored.
- `getVaultStatus` returns `email` / `emailVerified` for a linked app holding such a grant.
- `revokeFlowstaIdentity` and `checkFlowstaLinkStatus` sweep ports 27777-27779 like every other call instead of assuming 27777; `authenticateWithVault` waits up to 125 s, past the Vault's unlock hold plus its 60 s dialog.
- `listVaultBackups` entries carry `labels` - every label the app has stored - so an app can reconcile its index against the Vault in one call.

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
