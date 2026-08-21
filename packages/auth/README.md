# @flowsta/auth

Flowsta Auth SDK - OAuth 2.0 authentication with PKCE, Vault detection, and agent linking for web applications.

## Features

- 🔐 **OAuth 2.0 + PKCE** - Secure authentication without client secrets
- 🌐 **Zero-Knowledge** - Your users' data stays private
- ⚡ **Simple Integration** - Just a few lines of code
- 🎨 **Framework Support** - Vanilla JS, React, and more
- 🔗 **Agent Linking** - Query Holochain agent identity links
- 🖥️ **Vault Detection** - Detect local Flowsta Vault desktop app
- ✍️ **Sign It** - Sign files on behalf of the authenticated user (requires `sign` scope)

## Installation

```bash
npm install @flowsta/auth
# or
yarn add @flowsta/auth
# or
pnpm add @flowsta/auth
```

## Quick Start

### 1. Create an App

Go to [dev.flowsta.com](https://dev.flowsta.com) and create an app to get your Client ID.

### 2. Redirect to Login

```typescript
import { FlowstaAuth } from '@flowsta/auth';

const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.com/auth/callback',
});

// Redirect to Flowsta login
document.getElementById('login-btn').onclick = () => auth.login();
```

### 3. Handle the Callback

On your redirect URI page (`/auth/callback`):

```typescript
import { FlowstaAuth } from '@flowsta/auth';

const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.com/auth/callback',
});

// Handle the OAuth callback
try {
  const user = await auth.handleCallback();
  console.log('Logged in as:', user.displayName);
  window.location.href = '/dashboard';
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### 4. Check Authentication Status

```typescript
if (auth.isAuthenticated()) {
  const user = auth.getUser();
  console.log('Welcome,', user.displayName);
}
```

## React Integration

```tsx
import { FlowstaAuthProvider, useFlowstaAuth } from '@flowsta/auth/react';

// Wrap your app
function App() {
  return (
    <FlowstaAuthProvider
      clientId="your-client-id"
      redirectUri="https://yoursite.com/auth/callback"
    >
      <MyApp />
    </FlowstaAuthProvider>
  );
}

// Use in components
function LoginButton() {
  const { isAuthenticated, user, login, logout } = useFlowstaAuth();

  if (isAuthenticated) {
    return (
      <div>
        <span>Hello, {user.displayName}!</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={login}>Sign in with Flowsta</button>;
}
```

### Protected Routes

```tsx
import { useRequireAuth } from '@flowsta/auth/react';

function ProtectedPage() {
  const { isReady, user } = useRequireAuth();
  // Or redirect to a custom URL: useRequireAuth({ redirectTo: '/login' })

  if (!isReady) return <div>Loading...</div>;
  return <div>Welcome, {user?.displayName}!</div>;
}
```

## Sign It

Let your users sign files with their Flowsta identity. Hashing happens in the browser — **files are never uploaded**.

Add the `sign` scope when you construct `FlowstaAuth`:

```typescript
const flowsta = new FlowstaAuth({
  clientId: 'your_client_id',
  redirectUri: 'https://your-app.com/callback',
  scopes: ['openid', 'email', 'display_name', 'sign'],
});
```

Users see "This app wants to sign files on your behalf" in the consent screen.

### Sign a file

```typescript
import { FlowstaAuth, hashFile } from '@flowsta/auth';

const file = fileInput.files[0];
const hash = await hashFile(file);

const result = await flowsta.signFile({
  fileHash: hash,
  intent: 'authorship',
  contentRights: {
    license: 'cc-by',
    ai_training: 'not_allowed',
    contact_preference: 'allow_contact_requests',
  },
});

console.log('Action hash:', result.action_hash);
console.log('Signed at:', result.signed_at);
```

### Verify a file

```typescript
const { signatures, count } = await flowsta.verifyFile(hash);
if (count > 0) {
  console.log(`${count} signer(s):`);
  signatures.forEach((s) => console.log(s.signer, s.revoked ? '(revoked)' : ''));
}
```

### Check content rights

```typescript
const rights = await flowsta.getContentRights(hash);
if (rights.signed) {
  rights.rights.forEach((r) => {
    console.log(r.signer, '→', r.license, '/', r.aiTraining);
  });
}
```

See the full [Sign It documentation](https://docs.flowsta.com/sign-it/) for field values, content-rights spec, and the verification API.

## API Reference

### FlowstaAuth

```typescript
const auth = new FlowstaAuth({
  clientId: string;      // Required: Your app's client ID
  redirectUri: string;   // Required: OAuth callback URL
  scopes?: string[];     // Optional: default ['openid', 'display_name'] - email is opt-in at both ends (v2.3.2+)
  loginUrl?: string;     // Optional: Flowsta login URL
  apiUrl?: string;       // Optional: Flowsta API URL
});
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `login()` | `Promise<void>` | Redirect to Flowsta login |
| `handleCallback()` | `Promise<FlowstaUser>` | Handle OAuth callback |
| `logout()` | `void` | Clear local session |
| `isAuthenticated()` | `boolean` | Check if user is logged in |
| `getUser()` | `FlowstaUser \| null` | Get current user |
| `getAccessToken()` | `string \| null` | Get access token |
| `getState()` | `AuthState` | Get full auth state |
| `detectVault()` | `Promise<VaultDetectionResult>` | Check if Flowsta Vault is running locally (sweeps ports 27777-27779 and caches the answer, v2.4.0). Since v2.5.0 the result carries `blocked: true` when the BROWSER refused the loopback request (Chrome 142+ Local Network Access permission, Brave) - the Vault may be running; don't tell the user to install one |
| `getLinkedAgents(agentPubKey?)` | `Promise<string[]>` | Get agents linked to current user or a specific agent |
| `areAgentsLinked(agentA, agentB)` | `Promise<boolean>` | Check if two agents are linked |
| `signFile(options)` | `Promise<SignResult>` | Sign a file hash (requires `sign` scope). Signs through Flowsta Vault when it's running (the user approves in the Vault); falls back to the API for legacy custodial accounts. Throws `VaultRequiredError` when neither can sign, and `VaultIdentityMismatchError` (v2.4.0) when the local Vault holds a DIFFERENT identity than the signed-in user - a signature must never come from someone else's Vault. The file is never uploaded. |
| `signBatch(options)` | `Promise<SignBatchResult>` | Sign multiple hashes in one request (legacy custodial API only — with the Vault, call `signFile()` per file so the user approves each) |
| `verifyFile(hash)` | `Promise<VerifyResult>` | Check if a hash has been signed. Public endpoint. |
| `getContentRights(hash)` | `Promise<ContentRightsResult>` | Return just the declared content-rights for a hash |

#### Which browsers reach the Vault _(verified 2026-08)_

`detectVault()` and Vault-first signing call `http://127.0.0.1` from your page. Chromium (Chrome 142+ behind a one-time Local Network Access prompt) and Firefox allow it; Safari blocks it (WebKit mixed-content), Brave blocks it silently unless the site is on Brave's allowlist, phones have no Vault. A denied permission looks like an absent Vault - `detectVault().blocked` / `VaultBlockedError` tell them apart (`loopbackPermissionState()` is exported too). For the non-reaching cases use the relay login in `@flowsta/holochain`.

#### Utilities

| Export | Returns | Description |
|--------|---------|-------------|
| `hashFile(file)` | `Promise<string>` | SHA-256 hex hash of a File, computed entirely in the browser |
| `agentKeysMatch(a, b)` | `boolean \| null` | Compare two agent keys across their base64url and base58 encodings (`uhCAk...` appears in both). `null` = can't decode either side (v2.4.0) |

#### Errors

All errors extend `FlowstaAuthError` (which carries `.code`):

| Error | When | Suggested UX |
|-------|------|--------------|
| `VaultRequiredError` | Signing requested but no Vault can sign for this account | "Install or unlock Flowsta Vault" |
| `VaultBlockedError` _(2.5.0)_ | The browser refused this page's request to reach the Vault (Local Network Access permission denied; Brave's localhost block) - the Vault may be running | "Allow this site to reach apps on your device in the browser's site settings" |
| `VaultIdentityMismatchError` _(2.4.0)_ | The local Vault is signed in as a different identity than this session's user - refused before any signature is made | "Unlock the Vault for THIS account, or sign out" |
| `UserDeniedError` | The user rejected the request in the Vault | "Signing cancelled" |

### FlowstaUser

```typescript
interface FlowstaUser {
  id: string;
  email?: string;              // Legacy custodial accounts only — device-hosted
                               // accounts (the norm) never expose an email; the
                               // server stores only a hash. Ask the user if you
                               // need one.
  username?: string;           // User's username (if set)
  displayName?: string;        // Display name
  profilePicture?: string;     // Profile picture URL
  agentPubKey?: string;        // Holochain agent public key
  did?: string;                // W3C Decentralized Identifier
  linkedAgents?: LinkedAgent[];// Linked agents (DHT-verified)
  signingMode?: 'remote' | 'ipc'; // Observed at sign-in; signFile() re-probes live
}

interface LinkedAgent {
  agentPubKey: string;
  linkedAt?: string;
  isRevoked: boolean;
}

interface VaultDetectionResult {
  running: boolean;
  agentPubKey?: string;
  did?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: FlowstaUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}
```

## Security

This SDK uses **OAuth 2.0 Authorization Code Flow with PKCE**, which means:

- ✅ No client secrets needed (safe for browser/mobile apps)
- ✅ Authorization codes are protected by PKCE challenge
- ✅ State parameter prevents CSRF attacks
- ✅ Access tokens stored in `localStorage`
- ✅ PKCE verifiers stored in `sessionStorage` (cleared after use)

## Documentation

- [SDK Documentation](https://docs.flowsta.com/sdk/auth)
- [OAuth Integration Guide](https://docs.flowsta.com/auth/)
- [API Reference](https://docs.flowsta.com/auth/api-reference)

## License

MIT
