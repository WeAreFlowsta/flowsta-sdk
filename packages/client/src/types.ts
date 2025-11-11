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
  displayName: string;
  agentPubKey: string;
  did: string;
  emailVerified: boolean;
  profilePicture: string;
  hasCustomPicture: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
  dashboardVisitCount?: number;
  isFirstDashboardVisit?: boolean;
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
 * Block user input
 */
export interface BlockUserInput {
  userId: string;
  reason?: string;
}

/**
 * Block user result
 */
export interface BlockUserResult {
  success: boolean;
  message: string;
  blockedUser: {
    userId: string;
    blockedAt: string;
    reason: string | null;
  };
}

/**
 * Unblock user input
 */
export interface UnblockUserInput {
  userId: string;
}

/**
 * Unblock user result
 */
export interface UnblockUserResult {
  success: boolean;
  message: string;
  unblockedUser: {
    userId: string;
    unblockedAt: string;
  };
}

/**
 * Blocked user
 */
export interface BlockedUser {
  userId: string;
  displayName: string | null;
  email: string; // Email hash
  did: string | null;
  blockedAt: string;
  reason: string | null;
}

/**
 * Blocked users pagination
 */
export interface BlockedUsersPagination {
  page: number;
  limit: number;
  totalBlocked: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Get blocked users result
 */
export interface GetBlockedUsersResult {
  success: boolean;
  blockedUsers: BlockedUser[];
  pagination: BlockedUsersPagination;
}

/**
 * Check user status result
 */
export interface CheckUserStatusResult {
  success: boolean;
  userId: string;
  isBlocked: boolean;
  blockDetails: {
    blockedAt: string;
    reason: string | null;
  } | null;
}

/**
 * Site statistics
 */
export interface SiteStats {
  totalBlockedUsers: number;
  blocksLast30Days: number;
  totalActiveUsers: number;
  siteName: string;
  siteId: string;
}

/**
 * Get site stats result
 */
export interface GetSiteStatsResult {
  success: boolean;
  stats: SiteStats;
}

/**
 * API Error
 */
export interface FlowstaError {
  error: string;
  message: string;
}

