# @flowsta/auth-client

Official Client SDK for Flowsta Authentication - Integrate censorship-resistant authentication into your application.

## Installation

```bash
npm install @flowsta/auth-client
```

## Quick Start

### 1. Get Your Credentials

1. Visit the [Flowsta Developer Dashboard](https://dev.flowsta.com/dashboard)
2. Create a new app
3. Copy your `clientId` and `clientSecret`

⚠️ **Important**: Never expose your `clientSecret` in client-side code!

### 2. Server-Side Usage (Node.js)

```typescript
import { FlowstaClient } from '@flowsta/auth-client';

const flowsta = new FlowstaClient({
  clientId: process.env.FLOWSTA_CLIENT_ID!,
  clientSecret: process.env.FLOWSTA_CLIENT_SECRET!, // Required for server-side
});

// Register a new user
const result = await flowsta.registerUser({
  email: 'user@example.com',
  password: 'securepassword',
  displayName: 'John Doe',
});

console.log(result.user); // User object
console.log(result.token); // JWT access token
console.log(result.refreshToken); // Refresh token
```

### 3. Client-Side Usage (Browser)

```typescript
import { FlowstaClient } from '@flowsta/auth-client';

// Client-side: Only clientId needed (for public operations like token verification)
const flowsta = new FlowstaClient({
  clientId: 'flowsta_app_abc123',
});

// Verify a token (doesn't require clientSecret)
const verification = await flowsta.verifyToken(token);
console.log(verification.valid); // true/false

// Get user profile
const { user } = await flowsta.getUser(token);
console.log(user.email);
```

## API Reference

### Constructor

```typescript
const flowsta = new FlowstaClient(config: FlowstaClientConfig);
```

**Config Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | `string` | Yes | Your app's client ID |
| `clientSecret` | `string` | No* | Your app's client secret (*Required for server-side operations) |
| `apiUrl` | `string` | No | Custom API URL (defaults to production) |
| `timeout` | `number` | No | Request timeout in ms (default: 10000) |

### Methods

#### `registerUser(input: RegisterInput): Promise<AuthResult>`

Register a new user. **Requires `clientSecret`** (server-side only).

```typescript
const result = await flowsta.registerUser({
  email: 'user@example.com',
  password: 'securepassword',
  displayName: 'John Doe', // Optional
});

// Returns:
// {
//   user: { id, email, displayName, verified, createdAt },
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
//   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
//   expiresIn: 86400
// }
```

#### `loginUser(input: LoginInput): Promise<AuthResult>`

Login a user. **Requires `clientSecret`** (server-side only).

```typescript
const result = await flowsta.loginUser({
  email: 'user@example.com',
  password: 'securepassword',
});
```

#### `verifyToken(token: string): Promise<VerifyResult>`

Verify a JWT token. **Does not require `clientSecret`** (can be used client-side).

```typescript
const result = await flowsta.verifyToken(token);

// Returns:
// {
//   valid: true,
//   userId: 'usr_123...',
//   email: 'user@example.com',
//   expiresAt: '2024-10-21T12:00:00.000Z'
// }
```

#### `refreshToken(refreshToken: string): Promise<RefreshResult>`

Refresh an access token. **Does not require `clientSecret`**.

```typescript
const result = await flowsta.refreshToken(refreshToken);

// Returns:
// {
//   token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
//   expiresIn: 86400
// }
```

#### `getUser(token: string): Promise<GetUserResult>`

Get user profile by token. **Does not require `clientSecret`**.

```typescript
const result = await flowsta.getUser(token);

// Returns:
// {
//   user: {
//     id: 'usr_123...',
//     email: 'user@example.com',
//     displayName: 'John Doe',
//     verified: false,
//     createdAt: '2024-10-20T10:30:00.000Z',
//     updatedAt: '2024-10-20T10:30:00.000Z'
//   }
// }
```

## Error Handling

The SDK provides typed error classes for better error handling:

```typescript
import {
  FlowstaClient,
  InvalidCredentialsError,
  TokenExpiredError,
  ConflictError,
  ValidationError,
} from '@flowsta/auth-client';

try {
  await flowsta.loginUser({ email, password });
} catch (error) {
  if (error instanceof InvalidCredentialsError) {
    console.error('Wrong email or password');
  } else if (error instanceof TokenExpiredError) {
    console.error('Token has expired, please refresh');
  } else if (error instanceof ConflictError) {
    console.error('User already exists');
  } else if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Error Classes

- `FlowstaAuthError` - Base error class
- `AuthenticationError` - Authentication failed (401)
- `InvalidCredentialsError` - Invalid email/password
- `TokenExpiredError` - Token has expired
- `InvalidTokenError` - Token is invalid
- `ValidationError` - Invalid input (400)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflict (409)
- `RateLimitError` - Rate limit exceeded (429)
- `ServerError` - Server error (500)
- `NetworkError` - Network request failed
- `AppDisabledError` - App has been disabled (403)

## Full Example: Express.js API

```typescript
import express from 'express';
import { FlowstaClient, InvalidCredentialsError } from '@flowsta/auth-client';

const app = express();
app.use(express.json());

const flowsta = new FlowstaClient({
  clientId: process.env.FLOWSTA_CLIENT_ID!,
  clientSecret: process.env.FLOWSTA_CLIENT_SECRET!,
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await flowsta.registerUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await flowsta.loginUser(req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
});

// Verify token middleware
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const verification = await flowsta.verifyToken(token);
    
    if (!verification.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.userId = verification.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token verification failed' });
  }
}

// Protected route
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.replace('Bearer ', '');
    const { user } = await flowsta.getUser(token);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  FlowstaClientConfig,
  FlowstaUser,
  RegisterInput,
  LoginInput,
  AuthResult,
  VerifyResult,
  RefreshResult,
  GetUserResult,
} from '@flowsta/auth-client';
```

## Security Best Practices

1. **Never expose `clientSecret` in client-side code**
   - Use environment variables
   - Only use on your backend server

2. **Store tokens securely**
   - Use `httpOnly` cookies for web apps
   - Use secure storage on mobile apps

3. **Implement token refresh**
   - Refresh tokens before they expire
   - Use refresh tokens for long-lived sessions

4. **Validate tokens on every request**
   - Don't trust client-side validation alone
   - Always verify tokens server-side

## What is Flowsta?

Flowsta provides censorship-resistant authentication:

- 🔐 **Can't Delete Users**: Site owners can block locally, but can't delete global identity
- 🌐 **Single Sign-On**: One login works across all Flowsta-enabled sites
- 🔑 **Distributed Identity**: Built on decentralized architecture
- ⚡ **Easy Integration**: Auth0-like developer experience

## Support

- **Documentation**: https://docs.flowsta.com
- **Developer Dashboard**: https://dev.flowsta.com
- **Issues**: https://github.com/WeAreFlowsta/flowsta-sdk/issues
- **Discord**: https://discord.gg/flowsta

## License

MIT

