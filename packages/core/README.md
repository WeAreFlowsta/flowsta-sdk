# @flowsta/auth-sdk

Official JavaScript SDK for Flowsta Authentication - Censorship-resistant, Single Sign-On authentication for web applications.

## Features

- 🔐 Email/password authentication
- 🌐 Single Sign-On across multiple sites
- 🔑 Built on Holochain for censorship resistance
- ⚡ TypeScript support
- 📦 Framework agnostic (works with any JavaScript framework)
- 🎣 React hooks available in separate package

## Installation

```bash
npm install @flowsta/auth-sdk
```

## Quick Start

```javascript
import { FlowstaAuth } from '@flowsta/auth-sdk';

// Initialize
const flowsta = new FlowstaAuth({
  domain: 'auth.flowsta.com',
  clientId: 'your-site-id',
  redirectUri: window.location.origin,
});

// Register
await flowsta.register({
  email: 'user@example.com',
  password: 'securepassword',
  displayName: 'John Doe',
});

// Login
await flowsta.login({
  email: 'user@example.com',
  password: 'securepassword',
});

// Check authentication status
const isAuth = flowsta.isAuthenticated();
const user = flowsta.getUser();
const token = flowsta.getToken();

// Logout
flowsta.logout();
```

## API Reference

### FlowstaAuth

Main authentication class.

#### Constructor

```typescript
new FlowstaAuth(config: FlowstaAuthConfig)
```

**Config options:**
- `domain` (string): API domain (e.g., 'auth.flowsta.com')
- `clientId` (string): Your site/client ID
- `redirectUri` (string, optional): Redirect URI after login

#### Methods

##### `register(input: RegisterInput): Promise<void>`

Register a new user.

```typescript
await flowsta.register({
  email: 'user@example.com',
  password: 'password123',
  displayName: 'Optional Name',
});
```

##### `login(input: LoginInput): Promise<void>`

Login with email and password.

```typescript
await flowsta.login({
  email: 'user@example.com',
  password: 'password123',
});
```

##### `logout(): void`

Logout and clear local state.

##### `getUser(): FlowstaUser | null`

Get current user.

##### `getToken(): string | null`

Get current JWT token.

##### `isAuthenticated(): boolean`

Check if user is authenticated.

##### `refreshToken(): Promise<void>`

Refresh the JWT token.

##### `fetchUser(): Promise<FlowstaUser>`

Fetch fresh user data from API.

##### `subscribe(listener: (state: FlowstaAuthState) => void): () => void`

Subscribe to state changes. Returns an unsubscribe function.

```typescript
const unsubscribe = flowsta.subscribe((state) => {
  console.log('Auth state changed:', state);
});

// Later...
unsubscribe();
```

## React Integration

For React applications, use the separate React package:

```bash
npm install @flowsta/auth-react
```

See [@flowsta/auth-react](../auth-react) documentation.

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  FlowstaAuthConfig,
  FlowstaUser,
  FlowstaAuthState,
  RegisterInput,
  LoginInput,
} from '@flowsta/auth-sdk';
```

## License

MIT

## Support

- Documentation: https://docs.flowsta.com
- Issues: https://github.com/WeAreFlowsta/flowsta-sdk/issues
- Community: https://discord.gg/flowsta

