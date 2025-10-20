/**
 * TypeScript type definitions for @flowsta/auth-client
 */

/**
 * Configuration options for FlowstaClient
 */
export interface FlowstaClientConfig {
  /**
   * Your client ID from the Flowsta developer dashboard
   */
  clientId: string;

  /**
   * Your client secret (REQUIRED for server-side, optional for client-side)
   * WARNING: Never expose your client secret in client-side code!
   */
  clientSecret?: string;

  /**
   * API base URL (defaults to production API)
   */
  apiUrl?: string;

  /**
   * Request timeout in milliseconds (default: 10000)
   */
  timeout?: number;
}

/**
 * User object returned from API
 */
export interface FlowstaUser {
  id: string;
  email: string;
  displayName: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Register user input
 */
export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Login user input
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: FlowstaUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Token verification result
 */
export interface VerifyResult {
  valid: boolean;
  userId?: string;
  email?: string;
  expiresAt?: string;
}

/**
 * Token refresh result
 */
export interface RefreshResult {
  token: string;
  expiresIn: number;
}

/**
 * Get user result
 */
export interface GetUserResult {
  user: FlowstaUser;
}

/**
 * API Error
 */
export interface FlowstaError {
  error: string;
  message: string;
}

