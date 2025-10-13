/**
 * TypeScript types for Flowsta Auth SDK
 */

export interface FlowstaAuthConfig {
  /** API domain (e.g., 'auth.flowsta.com' or 'http://localhost:8080') */
  domain: string;
  /** Your site/client ID */
  clientId: string;
  /** Redirect URI after login */
  redirectUri?: string;
  /** Scope (reserved for future use) */
  scope?: string;
}

export interface FlowstaUser {
  /** User ID (UUID) */
  id: string;
  /** User email */
  email: string;
  /** Holochain agent public key */
  agentPubKey: string;
  /** Email verification status */
  emailVerified: boolean;
  /** Account creation timestamp */
  createdAt?: string;
  /** Last login timestamp */
  lastLogin?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: FlowstaUser;
  token: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: FlowstaUser;
  error?: string;
}

export interface FlowstaAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: FlowstaUser | null;
  token: string | null;
  error: Error | null;
}

