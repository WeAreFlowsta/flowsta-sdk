# Flowsta SDK

Official JavaScript SDK for Flowsta Authentication - Censorship-resistant, Single Sign-On authentication for web applications.

## Packages

This monorepo contains:

### [@flowsta/auth-sdk](./packages/core)

Core JavaScript/TypeScript SDK for Flowsta authentication.

```bash
npm install @flowsta/auth-sdk
```

**Features**:
- Email/password authentication
- JWT token management
- State subscription
- Framework agnostic
- TypeScript support

### [@flowsta/auth-react](./packages/react)

React hooks and components for Flowsta authentication.

```bash
npm install @flowsta/auth-sdk @flowsta/auth-react
```

**Features**:
- React Context Provider
- useFlowstaAuth() hook
- ProtectedRoute component
- Full TypeScript support

## Quick Start

### Vanilla JavaScript

```javascript
import { FlowstaAuth } from '@flowsta/auth-sdk';

const flowsta = new FlowstaAuth({
  domain: 'auth.flowsta.com',
  clientId: 'your-site-id',
});

await flowsta.login({ email: 'user@example.com', password: 'password' });
const user = flowsta.getUser();
```

### React

```jsx
import { FlowstaAuthProvider, useFlowstaAuth } from '@flowsta/auth-react';

function App() {
  return (
    <FlowstaAuthProvider config={{ domain: 'auth.flowsta.com', clientId: 'your-site-id' }}>
      <YourApp />
    </FlowstaAuthProvider>
  );
}

function Component() {
  const { user, isAuthenticated } = useFlowstaAuth();
  // ...
}
```

## What is Flowsta?

Flowsta provides censorship-resistant authentication powered by Holochain:

- 🔐 **Can't Delete Users**: Site owners can block locally, but can't delete global identity
- 🌐 **Single Sign-On**: One login works across all Flowsta-enabled sites
- 🔑 **Distributed Identity**: Built on Holochain's DHT for tamper-proof storage
- ⚡ **Easy Integration**: Auth0-like developer experience

## Documentation

- [Core SDK Documentation](./packages/core/README.md)
- [React Documentation](./packages/react/README.md)
- [Integration Guide](https://docs.flowsta.com)

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
- [Documentation](https://docs.flowsta.com)
- [GitHub](https://github.com/WeAreFlowsta/flowsta-sdk)
- [Issues](https://github.com/WeAreFlowsta/flowsta-sdk/issues)

