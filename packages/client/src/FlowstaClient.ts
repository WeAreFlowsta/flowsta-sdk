/**
 * Flowsta Auth Client SDK
 * Main SDK class for integrating Flowsta authentication into your application
 */
import type {
  FlowstaClientConfig,
  RegisterInput,
  LoginInput,
  AuthResult,
  VerifyResult,
  RefreshResult,
  GetUserResult,
  FlowstaError,
} from './types';
import {
  FlowstaAuthError,
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  AppDisabledError,
} from './errors';

/**
 * Default API URL (production)
 */
const DEFAULT_API_URL = 'https://auth-api.flowsta.com';

/**
 * Default request timeout (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

export class FlowstaClient {
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly apiUrl: string;
  private readonly timeout: number;

  /**
   * Create a new Flowsta client
   */
  constructor(config: FlowstaClientConfig) {
    if (!config.clientId) {
      throw new ValidationError('clientId is required');
    }

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.apiUrl = config.apiUrl || DEFAULT_API_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;

    // Warn if clientSecret is missing in Node environment
    if (typeof process !== 'undefined' && process.env && !this.clientSecret) {
      console.warn(
        '⚠️  Flowsta Client SDK: clientSecret is recommended for server-side usage. ' +
        'Some operations may fail without it.'
      );
    }
  }

  /**
   * Register a new user
   * Requires: clientSecret (server-side only)
   */
  async registerUser(input: RegisterInput): Promise<AuthResult> {
    this.requireClientSecret('registerUser');

    return this.request<AuthResult>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
      requiresSecret: true,
    });
  }

  /**
   * Login a user
   * Requires: clientSecret (server-side only)
   */
  async loginUser(input: LoginInput): Promise<AuthResult> {
    this.requireClientSecret('loginUser');

    return this.request<AuthResult>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
      requiresSecret: true,
    });
  }

  /**
   * Verify a JWT token
   * Requires: clientId only (can be used client-side)
   */
  async verifyToken(token: string): Promise<VerifyResult> {
    return this.request<VerifyResult>('/api/v1/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
      requiresSecret: false,
    });
  }

  /**
   * Refresh an access token
   * Requires: clientId only (can be used client-side)
   */
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    return this.request<RefreshResult>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      requiresSecret: false,
    });
  }

  /**
   * Get user profile by token
   * Requires: clientId only (can be used client-side)
   */
  async getUser(token: string): Promise<GetUserResult> {
    return this.request<GetUserResult>('/api/v1/users/me', {
      method: 'GET',
      requiresSecret: false,
      bearerToken: token,
    });
  }

  /**
   * Block a user from your site
   * Requires: clientSecret (server-side only)
   */
  async blockUser(input: import('./types').BlockUserInput): Promise<import('./types').BlockUserResult> {
    this.requireClientSecret('blockUser');

    return this.request<import('./types').BlockUserResult>('/sites/block-user', {
      method: 'POST',
      body: JSON.stringify(input),
      requiresSecret: true,
    });
  }

  /**
   * Unblock a user from your site
   * Requires: clientSecret (server-side only)
   */
  async unblockUser(input: import('./types').UnblockUserInput): Promise<import('./types').UnblockUserResult> {
    this.requireClientSecret('unblockUser');

    return this.request<import('./types').UnblockUserResult>('/sites/unblock-user', {
      method: 'DELETE',
      body: JSON.stringify(input),
      requiresSecret: true,
    });
  }

  /**
   * Get paginated list of blocked users for your site
   * Requires: clientId only (can be used client-side for read)
   */
  async getBlockedUsers(page: number = 1, limit: number = 50): Promise<import('./types').GetBlockedUsersResult> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<import('./types').GetBlockedUsersResult>(`/sites/blocked-users?${params}`, {
      method: 'GET',
      requiresSecret: false,
    });
  }

  /**
   * Check if a specific user is blocked from your site
   * Requires: clientId only (can be used client-side for read)
   */
  async checkUserStatus(userId: string): Promise<import('./types').CheckUserStatusResult> {
    return this.request<import('./types').CheckUserStatusResult>(`/sites/check-user-status/${userId}`, {
      method: 'GET',
      requiresSecret: false,
    });
  }

  /**
   * Get statistics about your site's blocklist
   * Requires: clientId only (can be used client-side for read)
   */
  async getSiteStats(): Promise<import('./types').GetSiteStatsResult> {
    return this.request<import('./types').GetSiteStatsResult>('/sites/stats', {
      method: 'GET',
      requiresSecret: false,
    });
  }

  /**
   * Make an authenticated request to the Flowsta API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method: string;
      body?: string;
      requiresSecret: boolean;
      bearerToken?: string;
    }
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Id': this.clientId,
    };

    // Add client secret if required and available
    if (options.requiresSecret && this.clientSecret) {
      headers['X-Client-Secret'] = this.clientSecret;
    }

    // Add bearer token if provided
    if (options.bearerToken) {
      headers['Authorization'] = `Bearer ${options.bearerToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        throw this.createError(response.status, data as FlowstaError);
      }

      return data as T;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError || (error as any).name === 'AbortError') {
        throw new NetworkError('Network request failed or timed out');
      }

      // Re-throw Flowsta errors
      if (error instanceof FlowstaAuthError) {
        throw error;
      }

      // Unknown error
      throw new ServerError('An unexpected error occurred');
    }
  }

  /**
   * Create an appropriate error based on status code and error response
   */
  private createError(statusCode: number, errorData: FlowstaError): FlowstaAuthError {
    const message = errorData.message || errorData.error;

    switch (statusCode) {
      case 400:
        return new ValidationError(message);
      
      case 401:
        if (message.toLowerCase().includes('expired')) {
          return new TokenExpiredError(message);
        }
        if (message.toLowerCase().includes('invalid') && message.toLowerCase().includes('token')) {
          return new InvalidTokenError(message);
        }
        if (message.toLowerCase().includes('credentials')) {
          return new InvalidCredentialsError(message);
        }
        return new AuthenticationError(message);
      
      case 403:
        if (message.toLowerCase().includes('disabled')) {
          return new AppDisabledError(message);
        }
        return new AuthenticationError(message);
      
      case 404:
        return new NotFoundError(message);
      
      case 409:
        return new ConflictError(message);
      
      case 429:
        return new RateLimitError(message);
      
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message);
      
      default:
        return new FlowstaAuthError(message, statusCode, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Ensure clientSecret is available for operations that require it
   */
  private requireClientSecret(operation: string): void {
    if (!this.clientSecret) {
      throw new ValidationError(
        `clientSecret is required for ${operation}. ` +
        'This operation should only be performed server-side with a client secret.'
      );
    }
  }
}

