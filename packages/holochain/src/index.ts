/**
 * Flowsta Holochain SDK
 * 
 * Enables Holochain applications to use Flowsta for signing actions.
 * Users authenticate with Flowsta, granting signing permission to your app.
 * 
 * Features:
 * - Sign Holochain actions using Flowsta-managed agent keys
 * - Sign raw bytes for custom Holochain operations
 * - Manage signing permissions
 * - Works alongside @flowsta/auth for authentication
 * 
 * @example
 * ```typescript
 * import { FlowstaAuth } from '@flowsta/auth';
 * import { FlowstaHolochain } from '@flowsta/holochain';
 * 
 * const auth = new FlowstaAuth({
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yoursite.com/callback',
 *   scopes: ['openid', 'public_key', 'holochain:sign']
 * });
 * 
 * const holochain = new FlowstaHolochain({
 *   auth, // Pass the auth instance
 * });
 * 
 * // After user authenticates and grants permission...
 * const result = await holochain.signAction({
 *   type: 'CreateEntry',
 *   entry_type: 'message',
 *   payload: { content: 'Hello, Holochain!' }
 * });
 * ```
 */

export interface FlowstaHolochainConfig {
  /** Flowsta API URL. Default: 'https://auth-api.flowsta.com' */
  apiUrl?: string;
  /** Access token getter function or static token */
  accessToken: string | (() => string | null);
}

export interface SignActionRequest {
  /** The Holochain action to sign */
  action: Record<string, unknown>;
  /** Human-readable reason for signing (shown in audit log) */
  reason?: string;
}

export interface SignBytesRequest {
  /** Base64-encoded bytes to sign */
  bytes: string;
  /** Human-readable reason for signing (shown in audit log) */
  reason?: string;
}

export interface SignActionResponse {
  success: boolean;
  /** The signed action */
  signedAction: Record<string, unknown>;
  /** The signature (base64) */
  signature: string;
  /** The agent public key that signed */
  agentPubKey: string;
  /** User's DID */
  did: string;
  /** When the action was signed */
  signedAt: string;
}

export interface SignBytesResponse {
  success: boolean;
  /** The signature (base64) */
  signature: string;
  /** The agent public key that signed */
  agentPubKey: string;
}

export interface SigningPermission {
  id: string;
  appId: string;
  appName: string;
  appLogo?: string;
  scopes: string[];
  grantedAt: string;
  lastUsedAt?: string;
  signCount: number;
}

export interface ConsentRequiredError {
  error: 'consent_required';
  errorDescription: string;
  requiredScope: string;
  clientId: string;
}

export class FlowstaHolochainError extends Error {
  constructor(
    message: string,
    public code: string,
    public description?: string
  ) {
    super(message);
    this.name = 'FlowstaHolochainError';
  }
}

export class ConsentRequired extends FlowstaHolochainError {
  constructor(
    public requiredScope: string,
    public clientId: string
  ) {
    super(
      'User must grant signing permission. Re-authenticate with holochain:sign scope.',
      'consent_required',
      'User must authorize this app with holochain:sign scope'
    );
    this.name = 'ConsentRequired';
  }
}

/**
 * FlowstaHolochain - Holochain signing integration
 * 
 * Use this class to sign Holochain actions with the user's Flowsta identity.
 */
export class FlowstaHolochain {
  private config: Required<FlowstaHolochainConfig>;
  
  constructor(config: FlowstaHolochainConfig) {
    this.config = {
      apiUrl: config.apiUrl || 'https://auth-api.flowsta.com',
      accessToken: config.accessToken,
    };
  }
  
  /**
   * Get the current access token
   */
  private getAccessToken(): string | null {
    if (typeof this.config.accessToken === 'function') {
      return this.config.accessToken();
    }
    return this.config.accessToken;
  }
  
  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new FlowstaHolochainError(
        'No access token available. User must be authenticated.',
        'unauthorized'
      );
    }
    
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle consent required error specially
      if (data.error === 'consent_required') {
        throw new ConsentRequired(
          data.required_scope || 'holochain:sign',
          data.client_id || ''
        );
      }
      
      throw new FlowstaHolochainError(
        data.error_description || data.error || 'Request failed',
        data.error || 'request_failed',
        data.error_description
      );
    }
    
    return data;
  }
  
  /**
   * Sign a Holochain action
   * 
   * The user must have granted 'holochain:sign' permission to your app.
   * If not, this will throw a ConsentRequired error - handle it by
   * re-initiating the OAuth flow with the holochain:sign scope.
   * 
   * @param request - The action to sign
   * @returns The signed action with signature
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await holochain.signAction({
   *     action: {
   *       type: 'CreateEntry',
   *       entry_type: 'post',
   *       payload: { title: 'Hello', content: 'World' }
   *     },
   *     reason: 'Creating a new blog post'
   *   });
   *   console.log('Signature:', result.signature);
   * } catch (error) {
   *   if (error instanceof ConsentRequired) {
   *     // Re-authenticate with holochain:sign scope
   *     auth.login({ scopes: ['openid', 'holochain:sign'] });
   *   }
   * }
   * ```
   */
  async signAction(request: SignActionRequest): Promise<SignActionResponse> {
    const response = await this.request<{
      success: boolean;
      signed_action: Record<string, unknown>;
      signature: string;
      agent_pub_key: string;
      did: string;
      signed_at: string;
    }>('/holochain/sign', {
      method: 'POST',
      body: JSON.stringify({
        action: request.action,
        reason: request.reason,
      }),
    });
    
    return {
      success: response.success,
      signedAction: response.signed_action,
      signature: response.signature,
      agentPubKey: response.agent_pub_key,
      did: response.did,
      signedAt: response.signed_at,
    };
  }
  
  /**
   * Sign raw bytes
   * 
   * Use this for signing custom data or when you need to construct
   * Holochain actions yourself.
   * 
   * @param request - The bytes to sign (base64 encoded)
   * @returns The signature
   * 
   * @example
   * ```typescript
   * const bytesToSign = btoa(JSON.stringify(myData));
   * const result = await holochain.signBytes({
   *   bytes: bytesToSign,
   *   reason: 'Signing custom data'
   * });
   * console.log('Signature:', result.signature);
   * ```
   */
  async signBytes(request: SignBytesRequest): Promise<SignBytesResponse> {
    const response = await this.request<{
      success: boolean;
      signature: string;
      agent_pub_key: string;
    }>('/holochain/sign/bytes', {
      method: 'POST',
      body: JSON.stringify({
        bytes: request.bytes,
        reason: request.reason,
      }),
    });
    
    return {
      success: response.success,
      signature: response.signature,
      agentPubKey: response.agent_pub_key,
    };
  }
  
  /**
   * Get the user's signing permissions
   * 
   * Returns all apps the user has granted signing permission to.
   * Useful for displaying in a settings/dashboard UI.
   * 
   * @returns List of signing permissions
   */
  async getPermissions(): Promise<SigningPermission[]> {
    const response = await this.request<{
      success: boolean;
      permissions: Array<{
        id: string;
        app_id: string;
        app_name: string;
        app_logo?: string;
        scopes: string[];
        granted_at: string;
        last_used_at?: string;
        sign_count: number;
      }>;
    }>('/holochain/permissions');
    
    return response.permissions.map(p => ({
      id: p.id,
      appId: p.app_id,
      appName: p.app_name,
      appLogo: p.app_logo,
      scopes: p.scopes,
      grantedAt: p.granted_at,
      lastUsedAt: p.last_used_at,
      signCount: p.sign_count,
    }));
  }
  
  /**
   * Revoke signing permission for an app
   * 
   * After revoking, the app will no longer be able to sign actions
   * on behalf of the user.
   * 
   * @param appId - The app ID to revoke permission for
   * @returns true if successfully revoked
   */
  async revokePermission(appId: string): Promise<boolean> {
    const response = await this.request<{
      success: boolean;
    }>(`/holochain/permissions/${appId}`, {
      method: 'DELETE',
    });
    
    return response.success;
  }
  
  /**
   * Check if the user has granted signing permission
   * 
   * This is a quick check to see if you can call signAction/signBytes
   * without hitting a ConsentRequired error.
   * 
   * @returns true if signing permission is granted
   */
  async hasSigningPermission(): Promise<boolean> {
    try {
      const permissions = await this.getPermissions();
      // Check if any permission includes holochain:sign scope
      return permissions.some(p => p.scopes.includes('holochain:sign'));
    } catch (error) {
      // If we can't fetch permissions, assume no permission
      return false;
    }
  }
}

// Convenience function to create Holochain client from auth instance
export function createHolochainClient(
  auth: { getAccessToken: () => string | null },
  options?: { apiUrl?: string }
): FlowstaHolochain {
  return new FlowstaHolochain({
    accessToken: () => auth.getAccessToken(),
    apiUrl: options?.apiUrl,
  });
}

// Default export
export default FlowstaHolochain;

