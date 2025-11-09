# @flowsta/login-button

**Login with Flowsta** button components for React, Vue, and vanilla JavaScript.

Easily integrate OAuth 2.0 authentication with Flowsta into your web application using pre-designed, production-ready button components.

[![npm version](https://img.shields.io/npm/v/@flowsta/login-button.svg)](https://www.npmjs.com/package/@flowsta/login-button)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **6 Button Variants** - Dark, light, and neutral themes with pill or rectangle shapes
- ✅ **Framework Support** - React, Vue 3, and vanilla JavaScript
- ✅ **PKCE Built-in** - Secure OAuth 2.0 with Proof Key for Code Exchange
- ✅ **TypeScript** - Full type definitions included
- ✅ **Zero Dependencies** - No external runtime dependencies
- ✅ **Production Ready** - Professional button designs with proper accessibility

## Installation

```bash
npm install @flowsta/login-button
```

## Quick Start

### React

```tsx
import { FlowstaLoginButton } from '@flowsta/login-button/react';

function App() {
  return (
    <FlowstaLoginButton
      clientId="your-client-id"
      redirectUri="https://yourapp.com/callback"
      scopes={['profile', 'email']}
      variant="dark-pill"
      onSuccess={(data) => {
        console.log('Authorization code:', data.code);
        // Exchange code for token on your backend
      }}
      onError={(error) => {
        console.error('Login error:', error);
      }}
    />
  );
}
```

### Vue 3

```vue
<template>
  <FlowstaLoginButton
    clientId="your-client-id"
    redirectUri="https://yourapp.com/callback"
    :scopes="['profile', 'email']"
    variant="dark-pill"
    @success="handleSuccess"
    @error="handleError"
  />
</template>

<script setup>
import { FlowstaLoginButton } from '@flowsta/login-button/vue';

const handleSuccess = (data) => {
  console.log('Authorization code:', data.code);
  // Exchange code for token on your backend
};

const handleError = (error) => {
  console.error('Login error:', error);
};
</script>
```

### Vanilla JavaScript

```javascript
import { initFlowstaLoginButton } from '@flowsta/login-button/vanilla';

initFlowstaLoginButton('#login-container', {
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
  scopes: ['profile', 'email'],
  variant: 'dark-pill',
  onSuccess: (data) => {
    console.log('Authorization code:', data.code);
    // Exchange code for token on your backend
  },
  onError: (error) => {
    console.error('Login error:', error);
  }
});
```

## Button Variants

Choose from 6 professionally designed button variants:

| Variant | Description | Best For |
|---------|-------------|----------|
| `dark-pill` | Dark background, rounded corners | Light backgrounds, modern UI |
| `dark-rectangle` | Dark background, square corners | Light backgrounds, professional UI |
| `light-pill` | Light background, rounded corners | Dark backgrounds, modern UI |
| `light-rectangle` | Light background, square corners | Dark backgrounds, professional UI |
| `neutral-pill` | Gray background, rounded corners | Any background, subtle integration |
| `neutral-rectangle` | Gray background, square corners | Any background, professional look |

## OAuth Flow

The button handles the OAuth 2.0 Authorization Code Flow with PKCE:

1. **User clicks button** → Component generates PKCE pair and redirects to Flowsta
2. **User authenticates** → Flowsta login page (login.flowsta.com)
3. **User grants permissions** → Consent screen shows requested scopes
4. **Redirect back** → Your app receives authorization code
5. **Exchange code** → Your backend exchanges code for access token

### Handling the Callback

On your redirect URI page, handle the OAuth callback:

```typescript
import { handleCallback, retrieveCodeVerifier, validateState } from '@flowsta/login-button';

// Parse callback parameters
const { code, state, error, errorDescription } = handleCallback();

if (error) {
  console.error('OAuth error:', error, errorDescription);
} else if (code && state) {
  // Validate state to prevent CSRF
  if (validateState(state)) {
    // Retrieve code verifier for token exchange
    const codeVerifier = retrieveCodeVerifier(state);
    
    // Exchange code for token on your backend
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier })
    });
    
    const { access_token } = await response.json();
    // Store token and create user session
  }
}
```

### Backend Token Exchange

Exchange the authorization code for an access token:

```javascript
// Example: Node.js backend
app.post('/api/auth/token', async (req, res) => {
  const { code, codeVerifier } = req.body;
  
  const response = await fetch('https://auth-api.flowsta.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.FLOWSTA_CLIENT_ID,
      client_secret: process.env.FLOWSTA_CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      code_verifier: codeVerifier
    })
  });
  
  const tokens = await response.json();
  res.json(tokens);
});
```

## API Reference

### Props / Options

All components accept the following configuration:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `clientId` | `string` | ✅ | - | Your Flowsta application client ID |
| `redirectUri` | `string` | ✅ | - | URI to redirect back to after authentication |
| `scopes` | `string[]` | ❌ | `['profile']` | OAuth scopes: `'profile'`, `'email'` |
| `variant` | `string` | ❌ | `'dark-pill'` | Button variant (see variants above) |
| `loginUrl` | `string` | ❌ | `'https://login.flowsta.com'` | Flowsta login URL |
| `className` | `string` | ❌ | `''` | Custom CSS class name |
| `disabled` | `boolean` | ❌ | `false` | Whether button is disabled |

### Events / Callbacks

#### React

```tsx
interface FlowstaLoginButtonProps {
  onSuccess?: (data: { code: string; state: string }) => void;
  onError?: (error: { error: string; errorDescription?: string }) => void;
  onClick?: () => void;
}
```

#### Vue

```vue
<FlowstaLoginButton
  @success="(data) => { /* code, state */ }"
  @error="(error) => { /* error, errorDescription */ }"
  @click="() => { /* before redirect */ }"
/>
```

#### Vanilla

```javascript
{
  onSuccess: (data) => { /* code, state */ },
  onError: (error) => { /* error, errorDescription */ },
  onClick: () => { /* before redirect */ }
}
```

## OAuth Scopes

### `profile` (default)

Returns user's basic profile information:

```json
{
  "userId": "user_abc123",
  "displayName": "John Doe",
  "did": "did:key:z6Mk...",
  "agentPubKey": "uhCAk..."
}
```

### `email`

Returns user's email address (requires explicit permission):

```json
{
  "userId": "user_abc123",
  "displayName": "John Doe",
  "did": "did:key:z6Mk...",
  "agentPubKey": "uhCAk...",
  "email": "john@example.com",
  "emailVerified": true
}
```

**Note**: Email is stored encrypted in Flowsta. Users must explicitly grant permission for your app to access it.

## Utilities

The package also exports OAuth utilities for custom implementations:

```typescript
import {
  generatePKCEPair,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  handleCallback,
  validateState
} from '@flowsta/login-button';

// Generate PKCE pair
const { verifier, challenge } = await generatePKCEPair();

// Build custom authorization URL
const { url, state, codeVerifier } = await buildAuthorizationUrl({
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
  scopes: ['profile', 'email']
});

// Handle callback
const { code, state, error } = handleCallback();

// Validate state
const isValid = validateState(state);
```

## Examples

### Custom Button Content

#### React

```tsx
<FlowstaLoginButton
  clientId="your-client-id"
  redirectUri="https://yourapp.com/callback"
>
  <span>Custom Login Text</span>
</FlowstaLoginButton>
```

#### Vue

```vue
<FlowstaLoginButton
  clientId="your-client-id"
  redirectUri="https://yourapp.com/callback"
>
  <span>Custom Login Text</span>
</FlowstaLoginButton>
```

### Vanilla with Custom Container

```javascript
import { createFlowstaLoginButton } from '@flowsta/login-button/vanilla';

const button = createFlowstaLoginButton({
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
  variant: 'neutral-pill'
});

document.getElementById('my-container').appendChild(button);
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  ButtonVariant,
  FlowstaScope,
  FlowstaLoginConfig,
  FlowstaLoginSuccess,
  FlowstaLoginError,
  FlowstaLoginButtonProps
} from '@flowsta/login-button';
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Modern browsers with ES2020+ and Web Crypto API support

## Security

- **PKCE**: All OAuth flows use PKCE (Proof Key for Code Exchange) for enhanced security
- **State Parameter**: CSRF protection via state parameter validation
- **Secure Storage**: Code verifiers stored in sessionStorage with state correlation
- **No Client Secret**: Client secret never exposed to browser (backend only)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT © Flowsta

## Support

- 📖 [Documentation](https://docs.flowsta.com/guides/login-with-flowsta)
- 💬 [Community](https://community.flowsta.com)
- 🐛 [Issue Tracker](https://github.com/WeAreFlowsta/flowsta-sdk/issues)
- 📧 [Email Support](mailto:support@flowsta.com)

## Related Packages

- [`@flowsta/auth-sdk`](https://www.npmjs.com/package/@flowsta/auth-sdk) - Core authentication SDK
- [`@flowsta/auth-react`](https://www.npmjs.com/package/@flowsta/auth-react) - React hooks and context
- [`@flowsta/auth-client`](https://www.npmjs.com/package/@flowsta/auth-client) - HTTP client for Flowsta API

---

**Made with ❤️ by the Flowsta team**

