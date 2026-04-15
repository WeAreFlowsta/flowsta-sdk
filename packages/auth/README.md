# @flowsta/auth

Flowsta Auth SDK - OAuth 2.0 authentication with PKCE, Vault detection, and agent linking for web applications.

## Features

- 🔐 **OAuth 2.0 + PKCE** - Secure authentication without client secrets
- 🌐 **Zero-Knowledge** - Your users' data stays private
- ⚡ **Simple Integration** - Just a few lines of code
- 🎨 **Framework Support** - Vanilla JS, React, and more
- 🔗 **Agent Linking** - Query Holochain agent identity links
- 🖥️ **Vault Detection** - Detect local Flowsta Vault desktop app

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

## API Reference

### FlowstaAuth

```typescript
const auth = new FlowstaAuth({
  clientId: string;      // Required: Your app's client ID
  redirectUri: string;   // Required: OAuth callback URL
  scopes?: string[];     // Optional: default ['openid', 'email', 'display_name']
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
| `detectVault()` | `Promise<VaultDetectionResult>` | Check if Flowsta Vault is running locally |
| `getLinkedAgents(agentPubKey?)` | `Promise<string[]>` | Get agents linked to current user or a specific agent |
| `areAgentsLinked(agentA, agentB)` | `Promise<boolean>` | Check if two agents are linked |

### FlowstaUser

```typescript
interface FlowstaUser {
  id: string;
  email?: string;              // If 'email' scope was granted
  username?: string;           // User's username (if set)
  displayName?: string;        // Display name
  profilePicture?: string;     // Profile picture URL
  agentPubKey?: string;        // Holochain agent public key
  did?: string;                // W3C Decentralized Identifier
  linkedAgents?: LinkedAgent[];// Linked agents (DHT-verified)
  signingMode?: 'remote' | 'ipc'; // 'remote' = API, 'ipc' = Vault
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
- ✅ Access and refresh tokens stored in `localStorage`
- ✅ PKCE verifiers stored in `sessionStorage` (cleared after use)

## Documentation

- [SDK Documentation](https://docs.flowsta.com/sdk/auth)
- [OAuth Integration Guide](https://docs.flowsta.com/auth/)
- [API Reference](https://docs.flowsta.com/auth/api-reference)

## License

MIT
