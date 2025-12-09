/**
 * TypeScript types for Flowsta Auth SDK
 */

/**
 * Available OAuth scopes (granular)
 * - openid: User ID (sub) - auto-included
 * - email: Email address and verification status
 * - display_name: User's display name
 * - username: User's @username
 * - did: W3C Decentralized Identifier
 * - public_key: Holochain agent public key
 * - profile_picture: User's profile picture
 */
export type FlowstaScope = 
  | 'openid'
  | 'email'
  | 'display_name'
  | 'username'
  | 'did'
  | 'public_key'
  | 'profile_picture';

export interface FlowstaAuthConfig {
  /** API domain (e.g., 'auth.flowsta.com' or 'http://localhost:8080') */
  domain: string;
  /** Your site/client ID */
  clientId: string;
  /** Redirect URI after login */
  redirectUri?: string;
  /** 
   * Space-separated OAuth scopes to request
   * Available: openid, email, display_name, username, did, public_key, profile_picture
   * Example: 'openid display_name email'
   */
  scope?: string;
}

export interface FlowstaUser {
  /** User ID (UUID) */
  id: string;
  /** User email */
  email: string;
  /** Username (optional, privacy-friendly alternative to email for login) */
  username?: string | null;
  /** Holochain agent public key (uhCAk format) */
  agentPubKey: string;
  /** W3C DID identifier */
  did: string;
  /** Display name */
  displayName: string;
  /** Email verification status */
  emailVerified: boolean;
  /** Profile picture (base64 data URI - identicon or custom) */
  profilePicture: string;
  /** Whether user has uploaded a custom profile picture */
  hasCustomPicture: boolean;
  /** Account creation timestamp */
  createdAt?: string;
  /** Last login timestamp */
  lastLogin?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
  /** Username (optional, 3-30 chars, alphanumeric + underscore/hyphen, starts with letter) */
  username?: string;
}

export interface LoginInput {
  /** Email or username */
  emailOrUsername: string;
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

