# @flowsta/auth

Flowsta Auth SDK 2.0 - OAuth-only authentication for web applications.

## Features

- 🔐 **OAuth 2.0 + PKCE** - Secure authentication without client secrets
- 🌐 **Zero-Knowledge** - Your users' data stays private
- ⚡ **Simple Integration** - Just a few lines of code
- 🎨 **Framework Support** - Vanilla JS, React, and more

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

### 2. Add the Login Button

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
  console.log('Logged in as:', user.email);
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

// Callback page
function AuthCallback() {
  const { handleCallback, isLoading, error } = useFlowstaAuth();

  useEffect(() => {
    handleCallback()
      .then(() => window.location.href = '/dashboard')
      .catch(console.error);
  }, []);

  if (isLoading) return <p>Logging in...</p>;
  if (error) return <p>Error: {error}</p>;
  return null;
}
```

## API Reference

### FlowstaAuth

```typescript
const auth = new FlowstaAuth({
  clientId: string;      // Required: Your app's client ID
  redirectUri: string;   // Required: OAuth callback URL
  scopes?: string[];     // Optional: ['profile', 'email'] (default)
  loginUrl?: string;     // Optional: Flowsta login URL
  apiUrl?: string;       // Optional: Flowsta API URL
});
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `login()` | `Promise<void>` | Redirect to Flowsta login |
| `handleCallback()` | `Promise<FlowstaUser>` | Handle OAuth callback |
| `logout()` | `void` | Log out the user |
| `isAuthenticated()` | `boolean` | Check if user is logged in |
| `getUser()` | `FlowstaUser \| null` | Get current user |
| `getAccessToken()` | `string \| null` | Get access token |
| `getState()` | `AuthState` | Get full auth state |

### FlowstaUser

```typescript
interface FlowstaUser {
  id: string;
  email?: string;
  displayName?: string;
  profilePicture?: string;
  agentPubKey?: string;
  did?: string;
}
```

## Security

This SDK uses **OAuth 2.0 Authorization Code Flow with PKCE**, which means:

- ✅ No client secrets needed (safe for browser/mobile apps)
- ✅ Authorization codes are protected by PKCE challenge
- ✅ State parameter prevents CSRF attacks
- ✅ Tokens are securely stored in localStorage

## Migration from SDK 1.x

SDK 2.0 removes direct email/password authentication. All users now authenticate through Flowsta's hosted login page.

**Before (SDK 1.x):**
```typescript
// ❌ Deprecated - do not use
await auth.login(email, password);
await auth.register(email, password);
```

**After (SDK 2.0):**
```typescript
// ✅ OAuth redirect
await auth.login(); // Redirects to login.flowsta.com
```

## License

MIT

