# Flowsta SDK

Official JavaScript SDK for Flowsta Authentication - Zero-knowledge, OAuth-based Single Sign-On for web applications.

## Packages

### [@flowsta/auth](./packages/auth) ⭐ Recommended

**SDK 2.0** - OAuth-only authentication with PKCE. No client secrets needed.

```bash
npm install @flowsta/auth
```

**Features**:
- OAuth 2.0 Authorization Code Flow with PKCE
- Zero-knowledge architecture
- No client secrets needed (PKCE provides security)
- Simple "Sign in with Flowsta" integration
- TypeScript support

### [@flowsta/login-button](./packages/login-button)

Pre-built "Sign in with Flowsta" button components for multiple frameworks.

```bash
npm install @flowsta/login-button
```

**Supports**: React, Vue, Qwik, Vanilla JS

### [@flowsta/holochain](./packages/holochain)

Sign Holochain actions using your Flowsta identity.

```bash
npm install @flowsta/holochain
```

**Features**:
- Sign Holochain zome calls with your Flowsta agent key
- Seamless integration with Flowsta Auth
- TypeScript support

## Quick Start

### JavaScript/TypeScript

```typescript
import { FlowstaAuth } from '@flowsta/auth';

const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.com/auth/callback'
});

// Redirect to Flowsta login
auth.login();

// On your callback page
const user = await auth.handleCallback();
console.log(user.displayName, user.username);
```

### React

```jsx
import { FlowstaAuthProvider, useFlowstaAuth } from '@flowsta/auth/react';
import { FlowstaLoginButton } from '@flowsta/login-button/react';

function App() {
  return (
    <FlowstaAuthProvider
      clientId="your-client-id"
      redirectUri="https://yoursite.com/auth/callback"
    >
      <Dashboard />
    </FlowstaAuthProvider>
  );
}

function Dashboard() {
  const { isAuthenticated, user, login, logout } = useFlowstaAuth();
  
  if (!isAuthenticated) {
    return <FlowstaLoginButton onClick={login} variant="dark-pill" />;
  }
  
  return <div>Welcome, {user.displayName}!</div>;
}
```

### Callback Handler

```typescript
// On your /auth/callback page
import { FlowstaAuth } from '@flowsta/auth';

const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: window.location.origin + '/auth/callback'
});

// Handle the OAuth callback
try {
  const user = await auth.handleCallback();
  // User is now authenticated
  // Redirect to your app
  window.location.href = '/dashboard';
} catch (error) {
  console.error('Authentication failed:', error);
}
```

## User Data

After authentication, you'll receive a `FlowstaUser` object:

```typescript
interface FlowstaUser {
  id: string;           // Unique user ID
  email?: string;       // Email (if 'email' scope granted)
  username?: string;    // Username (if set by user)
  displayName?: string; // Display name
  profilePicture?: string;
  agentPubKey?: string; // Holochain agent public key
  did?: string;         // Decentralized Identifier
}
```

## What is Flowsta?

Flowsta provides zero-knowledge authentication powered by Holochain:

- 🔐 **Zero-Knowledge**: Your data is encrypted - only you can access it
- 🌐 **Single Sign-On**: One login works across all Flowsta-enabled sites
- 🔑 **Decentralized Identity**: Built on Holochain's DHT for censorship resistance
- ⚡ **Easy Integration**: Simple OAuth flow with PKCE security

## Deprecated Packages (SDK 1.0 - Legacy)

The following packages are deprecated and should not be used for new projects:

- `@flowsta/auth-sdk` (core) - Use `@flowsta/auth` instead
- `@flowsta/auth-client` (client) - Use `@flowsta/auth` instead
- `@flowsta/auth-react` (react) - Use `@flowsta/auth/react` instead
- `@flowsta/auth-widgets` (widgets) - No longer needed in SDK 2.0 (OAuth-only)

## Documentation

- [SDK 2.0 Documentation](./packages/auth/README.md)
- [Login Button Documentation](./packages/login-button/README.md)
- [React Documentation](./packages/react/README.md)
- [Developer Portal](https://dev.flowsta.com)

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Watch mode
npm run dev
```

## License

MIT

## Links

- [Website](https://flowsta.com)
- [Developer Portal](https://dev.flowsta.com)
- [GitHub](https://github.com/WeAreFlowsta/flowsta-sdk)
