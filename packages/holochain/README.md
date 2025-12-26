# @flowsta/holochain

Flowsta Holochain SDK - Sign Holochain actions using your Flowsta identity.

## Overview

This SDK enables Holochain applications to leverage Flowsta's identity system for signing actions. Users authenticate with Flowsta and grant your application permission to sign Holochain actions on their behalf.

**Key Features:**
- Sign Holochain actions with Flowsta-managed agent keys
- Sign raw bytes for custom Holochain operations
- Manage signing permissions
- Works alongside `@flowsta/auth` for authentication

## Installation

```bash
npm install @flowsta/auth @flowsta/holochain
```

## Quick Start

```typescript
import { FlowstaAuth } from '@flowsta/auth';
import { FlowstaHolochain, createHolochainClient } from '@flowsta/holochain';

// 1. Setup authentication with holochain:sign scope
const auth = new FlowstaAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://yoursite.com/callback',
  scopes: ['openid', 'public_key', 'holochain:sign']
});

// 2. Create Holochain client
const holochain = createHolochainClient(auth);

// 3. After user authenticates, sign actions
async function createHolochainEntry() {
  try {
    const result = await holochain.signAction({
      action: {
        type: 'CreateEntry',
        entry_type: 'message',
        payload: { content: 'Hello, Holochain!' }
      },
      reason: 'Creating a new message'
    });
    
    console.log('Signed action:', result.signedAction);
    console.log('Signature:', result.signature);
    console.log('Agent public key:', result.agentPubKey);
  } catch (error) {
    if (error instanceof ConsentRequired) {
      // User needs to grant permission - redirect to OAuth
      auth.login();
    }
  }
}
```

## API Reference

### `FlowstaHolochain`

Main class for Holochain signing operations.

#### Constructor

```typescript
const holochain = new FlowstaHolochain({
  // Access token - can be a string or a function that returns the token
  accessToken: auth.getAccessToken.bind(auth),
  // Optional: Custom API URL (defaults to production)
  apiUrl: 'https://auth-api.flowsta.com'
});
```

#### `signAction(request)`

Sign a Holochain action.

```typescript
const result = await holochain.signAction({
  action: {
    type: 'CreateEntry',
    entry_type: 'post',
    payload: { title: 'Hello', content: 'World' }
  },
  reason: 'Creating a new blog post' // Optional, shown in audit log
});

// Returns:
// {
//   success: true,
//   signedAction: { ... },
//   signature: 'base64-signature',
//   agentPubKey: 'uhCAk...',
//   did: 'did:holo:uhCAk...',
//   signedAt: '2025-01-15T10:30:00Z'
// }
```

#### `signBytes(request)`

Sign raw bytes for custom operations.

```typescript
const bytesToSign = btoa(JSON.stringify(myData));
const result = await holochain.signBytes({
  bytes: bytesToSign,
  reason: 'Signing custom data'
});

// Returns:
// {
//   success: true,
//   signature: 'base64-signature',
//   agentPubKey: 'uhCAk...'
// }
```

#### `getPermissions()`

Get all apps the user has granted signing permission to.

```typescript
const permissions = await holochain.getPermissions();

// Returns array of:
// {
//   id: 'uuid',
//   appId: 'uuid',
//   appName: 'My Holochain App',
//   appLogo: 'https://...',
//   scopes: ['holochain:sign'],
//   grantedAt: '2025-01-15T10:00:00Z',
//   lastUsedAt: '2025-01-15T10:30:00Z',
//   signCount: 42
// }
```

#### `revokePermission(appId)`

Revoke signing permission for an app.

```typescript
const revoked = await holochain.revokePermission('app-uuid');
console.log('Permission revoked:', revoked);
```

#### `hasSigningPermission()`

Check if the user has granted signing permission.

```typescript
const hasPermission = await holochain.hasSigningPermission();
if (!hasPermission) {
  // Prompt user to grant permission
}
```

### Helper Functions

#### `createHolochainClient(auth, options?)`

Convenience function to create a Holochain client from a FlowstaAuth instance.

```typescript
import { createHolochainClient } from '@flowsta/holochain';

const holochain = createHolochainClient(auth, {
  apiUrl: 'https://auth-api.flowsta.com' // optional
});
```

## Error Handling

### ConsentRequired

Thrown when the user hasn't granted `holochain:sign` permission.

```typescript
import { ConsentRequired } from '@flowsta/holochain';

try {
  await holochain.signAction({ action: myAction });
} catch (error) {
  if (error instanceof ConsentRequired) {
    // Re-authenticate with holochain:sign scope
    auth.login({ scopes: ['openid', 'holochain:sign'] });
  }
}
```

### FlowstaHolochainError

General error class for other API errors.

```typescript
import { FlowstaHolochainError } from '@flowsta/holochain';

try {
  await holochain.signAction({ action: myAction });
} catch (error) {
  if (error instanceof FlowstaHolochainError) {
    console.error('Error code:', error.code);
    console.error('Description:', error.description);
  }
}
```

## OAuth Scopes

When using this SDK, request these scopes during authentication:

| Scope | Description |
|-------|-------------|
| `openid` | Required for authentication |
| `public_key` | Returns the user's Holochain agent public key |
| `holochain:sign` | **Required** - Allows signing Holochain actions |

## Security Considerations

1. **User Consent**: Users must explicitly grant `holochain:sign` permission during OAuth.
2. **Audit Logging**: All signing operations are logged for user transparency.
3. **Permission Revocation**: Users can revoke signing permissions at any time from their Flowsta dashboard.
4. **Rate Limiting**: API endpoints are rate-limited to prevent abuse.

## License

MIT

