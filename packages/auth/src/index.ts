/**
 * Flowsta Auth SDK 2.0
 * 
 * OAuth-only authentication for partner sites.
 * All authentication flows through login.flowsta.com
 * 
 * Features:
 * - OAuth 2.0 Authorization Code Flow with PKCE
 * - Zero-knowledge architecture
 * - No client secrets needed (PKCE provides security)
 * - Simple "Sign in with Flowsta" integration
 */

export interface FlowstaAuthConfig {
  /** Your Flowsta application client ID (from dev.flowsta.com) */
  clientId: string;
  /** The URI to redirect back to after authentication */
  redirectUri: string;
  /** OAuth scopes to request. Default: ['profile', 'email'] */
  scopes?: string[];
  /** The Flowsta login URL. Default: 'https://login.flowsta.com' */
  loginUrl?: string;
  /** The Flowsta API URL. Default: 'https://auth-api.flowsta.com' */
  apiUrl?: string;
}

export interface FlowstaUser {
  /** User's unique ID */
  id: string;
  /** User's email address (if 'email' scope was granted) */
  email?: string;
  /** User's display name */
  displayName?: string;
  /** User's profile picture URL */
  profilePicture?: string;
  /** User's Holochain agent public key */
  agentPubKey?: string;
  /** User's DID (Decentralized Identifier) */
  did?: string;
}

export interface AuthState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** The current user (null if not authenticated) */
  user: FlowstaUser | null;
  /** The access token (null if not authenticated) */
  accessToken: string | null;
  /** Whether authentication is loading */
  isLoading: boolean;
  /** Any authentication error */
  error: string | null;
}

// PKCE utilities
async function generatePKCEPair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge };
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * FlowstaAuth class - Main SDK entry point
 * 
 * Usage:
 * ```typescript
 * const auth = new FlowstaAuth({
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yoursite.com/auth/callback'
 * });
 * 
 * // Redirect to login
 * auth.login();
 * 
 * // Handle callback (on your redirect URI page)
 * await auth.handleCallback();
 * 
 * // Get current user
 * const user = auth.getUser();
 * ```
 */
export class FlowstaAuth {
  private config: Required<FlowstaAuthConfig>;
  private accessToken: string | null = null;
  private user: FlowstaUser | null = null;
  
  constructor(config: FlowstaAuthConfig) {
    this.config = {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes || ['profile', 'email'],
      loginUrl: config.loginUrl || 'https://login.flowsta.com',
      apiUrl: config.apiUrl || 'https://auth-api.flowsta.com',
    };
    
    // Restore session from localStorage
    this.restoreSession();
  }
  
  /**
   * Redirect user to Flowsta login page
   * User will be redirected back to redirectUri after authentication
   */
  async login(): Promise<void> {
    const { verifier, challenge } = await generatePKCEPair();
    const state = generateRandomString(32);
    
    // Store PKCE verifier and state for callback
    sessionStorage.setItem('flowsta_code_verifier', verifier);
    sessionStorage.setItem('flowsta_state', state);
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    
    window.location.href = `${this.config.loginUrl}/login?${params.toString()}`;
  }
  
  /**
   * Handle OAuth callback after user authentication
   * Call this on your redirect URI page
   * @returns The authenticated user
   */
  async handleCallback(): Promise<FlowstaUser> {
    const params = new URLSearchParams(window.location.search);
    
    // Check for error
    const error = params.get('error');
    if (error) {
      const description = params.get('error_description') || error;
      throw new Error(description);
    }
    
    // Get authorization code
    const code = params.get('code');
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    // Verify state (CSRF protection)
    const state = params.get('state');
    const storedState = sessionStorage.getItem('flowsta_state');
    if (!state || state !== storedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    
    // Get PKCE verifier
    const codeVerifier = sessionStorage.getItem('flowsta_code_verifier');
    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier');
    }
    
    // Exchange code for token
    const tokenResponse = await fetch(`${this.config.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Token exchange failed');
    }
    
    const { access_token, refresh_token } = await tokenResponse.json();
    
    // Clean up PKCE storage
    sessionStorage.removeItem('flowsta_code_verifier');
    sessionStorage.removeItem('flowsta_state');
    
    // Fetch user info
    const userResponse = await fetch(`${this.config.apiUrl}/oauth/userinfo`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const userData = await userResponse.json();
    
    // Store session
    this.accessToken = access_token;
    this.user = {
      id: userData.sub || userData.id,
      email: userData.email,
      displayName: userData.display_name || userData.name,
      profilePicture: userData.picture || userData.profile_picture,
      agentPubKey: userData.agent_pub_key,
      did: userData.did,
    };
    
    localStorage.setItem('flowsta_access_token', access_token);
    localStorage.setItem('flowsta_user', JSON.stringify(this.user));
    if (refresh_token) {
      localStorage.setItem('flowsta_refresh_token', refresh_token);
    }
    
    return this.user;
  }
  
  /**
   * Log out the current user
   */
  logout(): void {
    this.accessToken = null;
    this.user = null;
    localStorage.removeItem('flowsta_access_token');
    localStorage.removeItem('flowsta_user');
    localStorage.removeItem('flowsta_refresh_token');
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }
  
  /**
   * Get the current user
   */
  getUser(): FlowstaUser | null {
    return this.user;
  }
  
  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }
  
  /**
   * Get current auth state
   */
  getState(): AuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.user,
      accessToken: this.accessToken,
      isLoading: false,
      error: null,
    };
  }
  
  private restoreSession(): void {
    if (typeof localStorage === 'undefined') return;
    
    const token = localStorage.getItem('flowsta_access_token');
    const userJson = localStorage.getItem('flowsta_user');
    
    if (token && userJson) {
      try {
        this.accessToken = token;
        this.user = JSON.parse(userJson);
      } catch {
        // Invalid stored data, clear it
        this.logout();
      }
    }
  }
}

// Default export for convenience
export default FlowstaAuth;

