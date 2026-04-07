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
 * - Flowsta Vault detection (desktop app IPC)
 * - Agent linking queries (DHT-verified identity proofs)
 */

// ── Types ──────────────────────────────────────────────────────────

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
  /** User's username (if set) */
  username?: string;
  /** User's display name */
  displayName?: string;
  /** User's profile picture URL */
  profilePicture?: string;
  /** User's Holochain agent public key */
  agentPubKey?: string;
  /** User's DID (Decentralized Identifier) */
  did?: string;
  /** Agents linked to this user (from DHT IsSamePersonEntry) */
  linkedAgents?: LinkedAgent[];
  /** Current signing mode ('remote' = API, 'ipc' = Flowsta Vault) */
  signingMode?: 'remote' | 'ipc';
}

/** A linked agent (verified on the DHT via IsSamePersonEntry) */
export interface LinkedAgent {
  /** The linked agent's public key */
  agentPubKey: string;
  /** When the link was created */
  linkedAt?: string;
  /** Whether the link has been revoked */
  isRevoked: boolean;
}

/** Flowsta Vault desktop app status */
export interface VaultDetectionResult {
  /** Whether Flowsta Vault is running and reachable on localhost */
  running: boolean;
  /** The vault agent's public key (if unlocked) */
  agentPubKey?: string;
  /** The vault agent's DID (if unlocked) */
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

// ── PKCE Utilities ─────────────────────────────────────────────────

async function generatePKCEPair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge };
}

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
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

// ── Main Class ─────────────────────────────────────────────────────

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
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await userResponse.json();

    // Detect vault signing mode
    const vault = await this.detectVault();

    // Store session
    this.accessToken = access_token;
    this.user = {
      id: userData.sub || userData.id,
      email: userData.email,
      username: userData.preferred_username,
      displayName: userData.display_name || userData.name,
      profilePicture: userData.picture || userData.profile_picture,
      agentPubKey: userData.agent_pub_key,
      did: userData.did,
      signingMode: vault.running ? 'ipc' : 'remote',
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

  // ── Vault Detection ──────────────────────────────────────────────

  /**
   * Detect whether Flowsta Vault (desktop app) is running.
   *
   * Probes the IPC server at localhost:27777. If running and unlocked,
   * signing can be done locally instead of via the API.
   *
   * @returns Detection result with running status and agent info
   */
  async detectVault(): Promise<VaultDetectionResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://127.0.0.1:27777/status', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { running: false };
      }

      const data = await response.json();
      return {
        running: true,
        agentPubKey: data.agent_pub_key || data.agentPubKey,
        did: data.did,
      };
    } catch {
      return { running: false };
    }
  }

  // ── Agent Linking ────────────────────────────────────────────────

  /**
   * Get agents linked to a specific agent (or the current user's agent).
   *
   * Queries the API which reads from the DHT (IsSamePersonEntry).
   *
   * @param agentPubKey Optional specific agent to query. Defaults to current user's agent.
   * @returns List of linked agent public keys
   */
  async getLinkedAgents(agentPubKey?: string): Promise<string[]> {
    const token = this.accessToken;
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${this.config.apiUrl}/auth/linked-agents`);
    if (agentPubKey) {
      url.searchParams.set('agent_pub_key', agentPubKey);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to get linked agents');
    }

    const data = await response.json();
    return data.linked_agents || [];
  }

  /**
   * Check if two agents are linked (verified on the DHT).
   *
   * @param agentA First agent's public key
   * @param agentB Second agent's public key
   * @returns true if the agents are linked via an IsSamePersonEntry
   */
  async areAgentsLinked(agentA: string, agentB: string): Promise<boolean> {
    const token = this.accessToken;
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${this.config.apiUrl}/auth/are-agents-linked`);
    url.searchParams.set('agent_a', agentA);
    url.searchParams.set('agent_b', agentB);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.linked === true;
  }

  // ── Sign It Methods ──────────────────────────────────────────────

  /**
   * Sign a file hash. Requires 'sign' scope.
   * The file is never uploaded — only the hash is sent to the API.
   *
   * @example
   * ```typescript
   * const hash = await hashFile(file);
   * const result = await flowsta.signFile({ fileHash: hash, intent: 'authorship' });
   * ```
   */
  async signFile(options: {
    fileHash: string;
    intent?: string;
    aiGeneration?: string;
    contentRights?: Record<string, string>;
  }): Promise<{ success: boolean; file_hash: string; agent_pub_key: string; signed_at: number; action_hash: string | null }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${this.config.apiUrl}/api/v1/sign-it/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_hash: options.fileHash,
        intent: options.intent || 'Authorship',
        ai_generation: options.aiGeneration || null,
        content_rights: options.contentRights || null,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Signing failed');
    return data;
  }

  /**
   * Sign multiple file hashes in one request. Requires 'sign' scope.
   * Shared metadata applies to all files unless overridden per-file.
   */
  async signBatch(options: {
    files: Array<{ fileHash: string; intent?: string; aiGeneration?: string; contentRights?: Record<string, string> }>;
    sharedMetadata?: {
      intent?: string;
      aiGeneration?: string;
      contentRights?: Record<string, string>;
    };
  }): Promise<{ results: Array<{ file_hash: string; action_hash: string | null; success: boolean; error?: string }>; signed: number; failed: number }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${this.config.apiUrl}/api/v1/sign-it/sign-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        files: options.files.map((f) => ({
          file_hash: f.fileHash,
          intent: f.intent,
          ai_generation: f.aiGeneration,
          content_rights: f.contentRights,
        })),
        shared_metadata: options.sharedMetadata
          ? {
              intent: options.sharedMetadata.intent,
              ai_generation: options.sharedMetadata.aiGeneration,
              content_rights: options.sharedMetadata.contentRights,
            }
          : undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Batch signing failed');
    return data;
  }

  /**
   * Verify a file hash — check if it has been signed.
   * Public endpoint (no authentication required), but authenticated
   * requests with 'verify' scope get higher rate limits.
   */
  async verifyFile(fileHash: string): Promise<{
    signatures: Array<{
      file_hash: string;
      signer: string;
      signer_did?: string;
      signed_at: number;
      intent?: string;
      ai_generation?: string;
      content_rights?: Record<string, any>;
      revoked: boolean;
      contactable: boolean;
    }>;
    count: number;
  }> {
    const headers: Record<string, string> = {};
    const token = this.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(
      `${this.config.apiUrl}/api/v1/sign-it/verify?hash=${encodeURIComponent(fileHash)}`,
      { headers },
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Verification failed');
    return data;
  }

  /**
   * Get content rights for a file hash.
   * Convenience wrapper over verifyFile that returns just the rights info.
   */
  async getContentRights(fileHash: string): Promise<{
    signed: boolean;
    signerCount: number;
    rights: Array<{
      signer: string;
      license?: string;
      aiTraining?: string;
      commercialLicensing?: string;
      contactPreference?: string;
      aiGeneration?: string;
    }>;
  }> {
    const result = await this.verifyFile(fileHash);
    return {
      signed: result.count > 0,
      signerCount: result.count,
      rights: result.signatures
        .filter((s) => !s.revoked && s.content_rights)
        .map((s) => ({
          signer: s.signer_did || s.signer,
          license: s.content_rights?.license,
          aiTraining: s.content_rights?.ai_training,
          commercialLicensing: s.content_rights?.commercial_licensing,
          contactPreference: s.content_rights?.contact_preference,
          aiGeneration: s.ai_generation,
        })),
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

// ── Sign It Utilities ─────────────────────────────────────────────

/**
 * Hash a file using SHA-256 in the browser via SubtleCrypto.
 * The file is never uploaded — hashing happens entirely client-side.
 *
 * @example
 * ```typescript
 * import { hashFile } from '@flowsta/auth';
 *
 * const input = document.querySelector('input[type=file]');
 * const file = input.files[0];
 * const hash = await hashFile(file);
 * console.log(hash); // "a7f3b9c1e2d4..."
 * ```
 *
 * @param file - A File object from a file input or drag-and-drop
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
