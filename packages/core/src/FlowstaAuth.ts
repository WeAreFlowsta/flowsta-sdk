/**
 * Flowsta Authentication SDK
 * Main class for managing authentication state and token storage
 */
import { FlowstaAuthClient } from './client';
import type {
  FlowstaAuthConfig,
  FlowstaAuthState,
  FlowstaUser,
  RegisterInput,
  LoginInput,
} from './types';

const TOKEN_KEY = 'flowsta_auth_token';
const USER_KEY = 'flowsta_auth_user';

export class FlowstaAuth {
  private client: FlowstaAuthClient;
  private config: FlowstaAuthConfig;
  private state: FlowstaAuthState;
  private listeners: Set<(state: FlowstaAuthState) => void> = new Set();

  constructor(config: FlowstaAuthConfig) {
    this.config = config;
    this.client = new FlowstaAuthClient(config.domain, config.clientId);
    
    // Initialize state
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      error: null,
    };

    // Load token from storage
    this.loadFromStorage();
  }

  /**
   * Get current authentication state
   */
  getState(): FlowstaAuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: FlowstaAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update state and notify listeners
   */
  private setState(updates: Partial<FlowstaAuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Load token and user from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userJson = localStorage.getItem(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as FlowstaUser;
        this.setState({
          isAuthenticated: true,
          token,
          user,
        });
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  /**
   * Save token and user to localStorage
   */
  private saveToStorage(token: string, user: FlowstaUser): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  /**
   * Clear storage
   */
  private clearStorage(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<void> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await this.client.register(input);
      
      this.saveToStorage(response.token, response.user);
      this.setState({
        isAuthenticated: true,
        isLoading: false,
        token: response.token,
        user: response.user,
      });
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<void> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await this.client.login(input);
      
      this.saveToStorage(response.token, response.user);
      this.setState({
        isAuthenticated: true,
        isLoading: false,
        token: response.token,
        user: response.user,
      });
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Login with redirect (for popup/redirect flow)
   */
  async loginWithRedirect(): Promise<void> {
    // For now, this is a placeholder
    // In full implementation, would redirect to hosted login page
    throw new Error('loginWithRedirect not yet implemented - use login() with modal');
  }

  /**
   * Handle redirect callback
   */
  async handleRedirectCallback(): Promise<void> {
    // Placeholder for redirect flow
    // Would parse URL parameters and exchange code for token
    throw new Error('handleRedirectCallback not yet implemented');
  }

  /**
   * Logout - clear local state
   */
  logout(): void {
    this.clearStorage();
    this.setState({
      isAuthenticated: false,
      token: null,
      user: null,
    });
  }

  /**
   * Get current user (from state)
   */
  getUser(): FlowstaUser | null {
    return this.state.user;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.state.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<void> {
    if (!this.state.token) {
      throw new Error('No token to refresh');
    }

    try {
      const response = await this.client.refreshToken(this.state.token);
      this.saveToStorage(response.token, this.state.user!);
      this.setState({ token: response.token });
    } catch (error) {
      // Token refresh failed, logout
      this.logout();
      throw error;
    }
  }

  /**
   * Fetch fresh user data from API
   */
  async fetchUser(): Promise<FlowstaUser> {
    if (!this.state.token) {
      throw new Error('Not authenticated');
    }

    const user = await this.client.getUser(this.state.token);
    this.saveToStorage(this.state.token, user);
    this.setState({ user });
    return user;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.client.requestPasswordReset(email);
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await this.client.confirmPasswordReset(token, newPassword);
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    await this.client.verifyEmail(token);
    
    // Refresh user data to update emailVerified status
    if (this.state.isAuthenticated) {
      await this.fetchUser();
    }
  }
}

