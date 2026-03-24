# Flowsta SDK

Official JavaScript SDK for Flowsta Authentication - Zero-knowledge, OAuth-based Single Sign-On for web applications.

[![npm version](https://img.shields.io/npm/v/@flowsta/auth.svg)](https://www.npmjs.com/package/@flowsta/auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **New to Flowsta?** [Create a developer account](https://dev.flowsta.com) to get your Client ID.

## 📦 Packages

| Package | Version | Description |
|---------|---------|-------------|
| **[@flowsta/auth](./packages/auth)** ⭐ | `2.1.1` | Core OAuth SDK with React bindings |
| **[@flowsta/login-button](./packages/login-button)** | `0.1.3` | Pre-built button components |
| **[@flowsta/holochain](./packages/holochain)** | `2.1.0` | Vault agent linking & backup SDK |
| **[@flowsta/auth-tauri](./packages/auth-tauri)** | `0.1.0` | Desktop auth via Flowsta Vault |

## 🚀 Getting Started

### Prerequisites

1. **Get your Client ID**: [Sign up at dev.flowsta.com](https://dev.flowsta.com)
2. **Add redirect URI**: Configure `https://yoursite.com/auth/callback` in your app settings

### Choose Your Integration Method

#### Option 1: NPM Package (Recommended)

Install the SDK for modern web apps:

```bash
npm install @flowsta/auth
```

#### Option 2: Pre-built Buttons

For quick integration with UI components:

```bash
npm install @flowsta/login-button
```

Supports: **React**, **Vue**, **Qwik**, **Vanilla JS**

#### Option 3: No Build Tools?

Use vanilla JavaScript without npm:
- 📖 [Complete Vanilla JS Guide](https://docs.flowsta.com/oauth/vanilla-js)
- 🎨 [Download Button Assets](https://docs.flowsta.com/sdk/buttons)

## Core SDK Features

### [@flowsta/auth](./packages/auth)

OAuth 2.0 authentication with PKCE - no client secrets needed.

**Features**:
- ✅ OAuth 2.0 + PKCE (Proof Key for Code Exchange)
- ✅ Zero-knowledge architecture - user data stays encrypted
- ✅ React bindings included (`@flowsta/auth/react`)
- ✅ TypeScript-first with full type safety
- ✅ Zero dependencies - lightweight (< 10kb)
- ✅ Works in any JavaScript environment

### [@flowsta/login-button](./packages/login-button)

Pre-built "Sign in with Flowsta" button components.

**Features**:
- ✅ Multiple frameworks: React, Vue, Qwik, Vanilla JS
- ✅ 6 button variants (dark/light/neutral × pill/rectangle)
- ✅ Automatic PKCE generation and state management
- ✅ Customizable styling and behavior
- ✅ Inline SVG assets - works with any bundler

### [@flowsta/holochain](./packages/holochain)

Link your Holochain app's agent key with the user's Flowsta Vault identity.

**Features**:
- ✅ Agent identity linking via Vault IPC
- ✅ Auto-backups to Vault's encrypted storage
- ✅ Link status checks and revocation
- ✅ TypeScript-first with full type safety
- ✅ Zero dependencies

### [@flowsta/auth-tauri](./packages/auth-tauri)

Desktop app authentication via Flowsta Vault's Tauri IPC.

**Features**:
- ✅ Vault setup, unlock, and lock
- ✅ Identity management and web account linking
- ✅ Recovery phrase validation
- ✅ TypeScript-first with full type safety

## 💡 Quick Start Examples

### Vanilla JavaScript (No Build Tools)

Perfect for static HTML sites or simple projects:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sign in with Flowsta</title>
</head>
<body>
  <a href="#" id="login-btn">
    <img src="https://docs.flowsta.com/buttons/svg/flowsta_signin_web_dark_pill.svg" 
         alt="Sign in with Flowsta" 
         width="175" height="40">
  </a>

  <script type="module">
    import { FlowstaAuth } from 'https://unpkg.com/@flowsta/auth';

    const auth = new FlowstaAuth({
      clientId: 'your-client-id',
      redirectUri: window.location.origin + '/callback.html'
    });

    document.getElementById('login-btn').addEventListener('click', (e) => {
      e.preventDefault();
      auth.login();
    });
  </script>
</body>
</html>
```

**[View Complete Vanilla JS Guide →](https://docs.flowsta.com/oauth/vanilla-js)**

### React with Hooks

Using the built-in React bindings:

```tsx
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
  
  return (
    <div>
      <h1>Welcome, {user?.displayName}!</h1>
      <p>@{user?.username}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Vue 3 with Composition API

```vue
<script setup>
import { FlowstaAuth } from '@flowsta/auth';
import { FlowstaLoginButton } from '@flowsta/login-button/vue';
import { ref, onMounted } from 'vue';

const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.com/callback'
});

const user = ref(null);
const isAuthenticated = ref(false);

onMounted(() => {
  isAuthenticated.value = auth.isAuthenticated();
  user.value = auth.getUser();
});

const login = () => auth.login();
const logout = () => {
  auth.logout();
  isAuthenticated.value = false;
  user.value = null;
};
</script>

<template>
  <div v-if="!isAuthenticated">
    <FlowstaLoginButton
      client-id="your-client-id"
      redirect-uri="https://yoursite.com/callback"
      variant="dark-pill"
    />
  </div>
  <div v-else>
    <h1>Welcome, {{ user?.displayName }}!</h1>
    <button @click="logout">Logout</button>
  </div>
</template>
```

### Core SDK (TypeScript)

For maximum control and flexibility:

```typescript
import { FlowstaAuth } from '@flowsta/auth';

const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.com/auth/callback',
  scopes: ['openid', 'email', 'display_name', 'username']
});

// Redirect to Flowsta login
auth.login();

// On your callback page
try {
  const user = await auth.handleCallback();
  console.log('Authenticated:', user.displayName, user.username);
  // Redirect to dashboard
  window.location.href = '/dashboard';
} catch (error) {
  console.error('Authentication failed:', error);
  window.location.href = '/login?error=auth_failed';
}
```

## 🎨 Button Variants

The `@flowsta/login-button` package includes 6 official button styles:

| Variant | Best For | Preview |
|---------|----------|---------|
| `dark-pill` | Light backgrounds (recommended) | ![Dark Pill](https://docs.flowsta.com/buttons/svg/flowsta_signin_web_dark_pill.svg) |
| `dark-rectangle` | Light backgrounds, square style | ![Dark Rectangle](https://docs.flowsta.com/buttons/svg/flowsta_signin_web_dark_rectangle.svg) |
| `light-pill` | Dark backgrounds | ![Light Pill](https://docs.flowsta.com/buttons/svg/flowsta_signin_web_light_pill.svg) |
| `light-rectangle` | Dark backgrounds, square style | ![Light Rectangle](https://docs.flowsta.com/buttons/svg/flowsta_signin_web_light_rectangle.svg) |
| `neutral-pill` | Any background | ![Neutral Pill](https://docs.flowsta.com/buttons/svg/flowsta_signin_web_neutral_pill.svg) |
| `neutral-rectangle` | Any background, square style | ![Neutral Rectangle](https://docs.flowsta.com/buttons/svg/flowsta_signin_web_neutral_rectangle.svg) |

**[Download all button assets →](https://docs.flowsta.com/sdk/buttons)**

## 👤 User Data & Scopes

After authentication, you'll receive a `FlowstaUser` object with the requested scopes:

```typescript
interface FlowstaUser {
  sub: string;              // Unique user ID (always available)
  display_name?: string;    // Display name (if 'display_name' scope)
  username?: string;        // Username (if 'username' scope)
  email?: string;           // Email (if 'email' scope)
  email_verified?: boolean; // Email verification status
  profile_picture?: string; // Profile picture URL (if 'profile_picture' scope)
  agent_pub_key?: string;   // Holochain agent key (if 'public_key' scope)
  did?: string;             // Decentralized ID (if 'did' scope)
}
```

**Available Scopes:**
- `openid` - Required, provides user ID
- `email` - User's email address
- `display_name` - User's display name
- `username` - User's @username
- `profile_picture` - Profile picture URL
- `public_key` - Holochain agent public key
- `did` - W3C Decentralized Identifier

## 🔐 What is Flowsta?

Flowsta provides **zero-knowledge authentication** powered by Holochain:

- **🔐 Zero-Knowledge**: Your data is encrypted end-to-end - only you can decrypt it
- **🌐 Single Sign-On**: One login works across all Flowsta-enabled applications
- **🔑 Decentralized Identity**: Built on Holochain's DHT for censorship resistance
- **⚡ Easy Integration**: Standard OAuth 2.0 with PKCE security
- **🛡️ Privacy-First**: No tracking, no data mining, no selling your information

### How It Works

1. **User logs in** via `login.flowsta.com`
2. **Data is encrypted** with user's password (zero-knowledge)
3. **Stored on Holochain DHT** (decentralized, censorship-resistant)
4. **Your app receives** an access token via OAuth
5. **Fetch user data** from the Auth API (decrypted on-demand)

## 📚 Documentation

### Official Docs
- **[Getting Started Guide](https://docs.flowsta.com/getting-started/)** - Complete setup tutorial
- **[OAuth Quickstart](https://docs.flowsta.com/oauth/quickstart)** - NPM integration guide
- **[Vanilla JS Guide](https://docs.flowsta.com/oauth/vanilla-js)** - No build tools required
- **[Button Downloads](https://docs.flowsta.com/sdk/buttons)** - Download button assets
- **[API Reference](https://docs.flowsta.com/oauth/api-reference)** - Complete API docs
- **[Security Guide](https://docs.flowsta.com/oauth/security)** - Best practices

### Package READMEs
- [@flowsta/auth](./packages/auth/README.md) - Core SDK documentation
- [@flowsta/login-button](./packages/login-button/README.md) - Button components
- [@flowsta/holochain](./packages/holochain/README.md) - Vault agent linking & backups
- [@flowsta/auth-tauri](./packages/auth-tauri/README.md) - Desktop auth via Vault

### Developer Resources
- **[Developer Portal](https://dev.flowsta.com)** - Create apps, manage settings
- **[Community Discord](https://discord.gg/p7sfaZTaEc)** - Get help, share ideas
- **[GitHub Issues](https://github.com/WeAreFlowsta/flowsta-sdk/issues)** - Report bugs

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/WeAreFlowsta/flowsta-sdk.git
cd flowsta-sdk

# Install dependencies
npm install

# Build all packages
npm run build
```

### Available Scripts

```bash
npm run build       # Build all packages
npm run dev         # Watch mode for development
npm run test        # Run tests (coming soon)
npm run lint        # Lint code (coming soon)
```

### Package Structure

```
sdk-monorepo/
├── packages/
│   ├── auth/              # Core OAuth SDK with React bindings
│   ├── auth-tauri/        # Desktop auth via Flowsta Vault
│   ├── holochain/         # Vault agent linking & backup SDK
│   └── login-button/      # Pre-built button components
└── README.md
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT © Flowsta

## 🔗 Links

- **Website**: [flowsta.com](https://flowsta.com)
- **Documentation**: [docs.flowsta.com](https://docs.flowsta.com)
- **Developer Portal**: [dev.flowsta.com](https://dev.flowsta.com)
- **GitHub**: [github.com/WeAreFlowsta/flowsta-sdk](https://github.com/WeAreFlowsta/flowsta-sdk)
- **npm**: [@flowsta](https://www.npmjs.com/org/flowsta)

---

**Questions?** Join our [Discord community](https://discord.gg/p7sfaZTaEc) or check out the [documentation](https://docs.flowsta.com).
