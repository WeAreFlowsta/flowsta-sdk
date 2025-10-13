# @flowsta/auth-react

React hooks and components for Flowsta Authentication.

## Installation

```bash
npm install @flowsta/auth-sdk @flowsta/auth-react
```

## Quick Start

### 1. Wrap your app with FlowstaAuthProvider

```tsx
import { FlowstaAuthProvider } from '@flowsta/auth-react';

function App() {
  return (
    <FlowstaAuthProvider
      config={{
        domain: 'auth.flowsta.com',
        clientId: 'your-site-id',
      }}
    >
      <YourApp />
    </FlowstaAuthProvider>
  );
}
```

### 2. Use hooks in your components

```tsx
import { useFlowstaAuth, useFlowstaAuthActions } from '@flowsta/auth-react';

function LoginButton() {
  const { isAuthenticated, user } = useFlowstaAuth();
  const { login, logout } = useFlowstaAuthActions();

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.email}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => login({ email: 'user@example.com', password: 'pass' })}>
      Login
    </button>
  );
}
```

### 3. Protect routes

```tsx
import { ProtectedRoute } from '@flowsta/auth-react';

function Dashboard() {
  return (
    <ProtectedRoute fallback={<div>Please login</div>}>
      <h1>Protected Dashboard</h1>
    </ProtectedRoute>
  );
}
```

## API Reference

### Hooks

#### `useFlowstaAuth()`

Returns complete authentication state:
- `isAuthenticated`: boolean
- `isLoading`: boolean
- `user`: FlowstaUser | null
- `token`: string | null
- `error`: Error | null
- `flowstaAuth`: FlowstaAuth instance

#### `useFlowstaAuthActions()`

Returns authentication methods:
- `register(input)`: Register new user
- `login(input)`: Login
- `logout()`: Logout
- `refreshToken()`: Refresh JWT
- `requestPasswordReset(email)`: Request password reset
- `confirmPasswordReset(token, newPassword)`: Confirm reset
- `verifyEmail(token)`: Verify email

#### `useFlowstaUser()`

Returns user-specific state:
- `user`: FlowstaUser | null
- `isAuthenticated`: boolean
- `isLoading`: boolean

#### `useIsAuthenticated()`

Returns: `boolean`

Simple hook that returns authentication status.

### Components

#### `<FlowstaAuthProvider>`

**Props:**
- `config`: FlowstaAuthConfig (required)
- `children`: ReactNode (required)

#### `<ProtectedRoute>`

**Props:**
- `children`: ReactNode (required)
- `fallback`: ReactNode (optional) - shown when not authenticated
- `redirectTo`: string (optional) - redirect URL when not authenticated

## TypeScript

Full TypeScript support with all types from `@flowsta/auth-sdk`.

## License

MIT

