/**
 * API client for Flowsta Auth
 */
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  VerifyTokenResponse,
  FlowstaUser,
} from './types';

export class FlowstaAuthClient {
  private baseUrl: string;
  private clientId: string;

  constructor(domain: string, clientId: string) {
    // Normalize domain to full URL
    this.baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    this.clientId = clientId;
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string, siteId?: string): Promise<VerifyTokenResponse> {
    const response = await fetch(`${this.baseUrl}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
      },
      body: JSON.stringify({ token, siteId }),
    });

    return response.json();
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(token: string): Promise<{ success: boolean; token: string }> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Id': this.clientId,
      },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  /**
   * Get current user info
   */
  async getUser(token: string): Promise<FlowstaUser> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Client-Id': this.clientId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
      },
      body: JSON.stringify({ email }),
    });

    return response.json();
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; warning?: string }> {
    const response = await fetch(`${this.baseUrl}/auth/reset-password/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
      },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password reset failed');
    }

    return response.json();
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Email verification failed');
    }

    return response.json();
  }
}

