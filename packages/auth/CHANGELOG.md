# Changelog

## 2.4.0

- `signFile` refuses to sign through a Vault holding a DIFFERENT identity than the signed-in user: new `VaultIdentityMismatchError` - a signature must never come from someone else's Vault. Previously the mismatch went undetected.
- `detectVault` sweeps ports 27777-27779 (a second Vault instance shifts ports) and caches the answer.
- New export: `agentKeysMatch(a, b)` - compares agent keys across their base64url and base58 encodings; returns `null` when neither side decodes.

## 2.3.2

- Default request scopes drop `email` (matches the dev portal default - email is opt-in at both ends). Default is now `['openid', 'display_name']`.

## 2.3.1

- `handleCallback` completes login-button-initiated flows (accepts either package's PKCE storage keys).

## 2.3.0

- Sign through Flowsta Vault when present; typed errors; honest email semantics for device-hosted accounts.
