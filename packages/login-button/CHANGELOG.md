# Changelog



## [0.2.0] - 2026-10-15

### Added
- `adoptHandoffFragment()` / `parseHandoffFragment(hash)`: a callback page opened by a desktop app through the hand-off (`@flowsta/holochain` `openWebSignedIn`) carries the PKCE verifier and state in the URL fragment; `handleCallback()` now adopts them first and clears the fragment from the address bar and history, so the rest of the callback is unchanged. No change needed on callback pages that call `handleCallback()`.
- `npm test` runs vitest for this package.

