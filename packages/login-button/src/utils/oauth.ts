/**
 * OAuth 2.0 utilities for Flowsta authentication
 */

import { generatePKCEPair, storeCodeVerifier } from './pkce.js';
import { generateState, storeState } from './state.js';

export interface OAuthConfig {
  /** Your Flowsta application client ID */
  clientId: string;
  /** The URI to redirect back to after authentication */
  redirectUri: string;
  /** OAuth scopes to request (e.g., ['profile', 'email']) */
  scopes: string[];
  /** The Flowsta login URL (default: https://login.flowsta.com) */
  loginUrl?: string;
}

export interface AuthorizationUrlResult {
  /** The complete authorization URL to redirect to */
  url: string;
  /** The state parameter (for validation) */
  state: string;
  /** The code verifier (store securely for token exchange) */
  codeVerifier: string;
}

/**
 * Build the OAuth authorization URL with PKCE
 * @param config - OAuth configuration
 * @returns Promise resolving to authorization URL and PKCE parameters
 */
export async function buildAuthorizationUrl(
  config: OAuthConfig
): Promise<AuthorizationUrlResult> {
  const loginUrl = config.loginUrl || 'https://login.flowsta.com';
  
  // Generate PKCE pair
  const { verifier, challenge } = await generatePKCEPair();
  
  // Generate state for CSRF protection
  const state = generateState();
  
  // Store verifier and state for later use
  storeCodeVerifier(verifier, state);
  storeState(state);
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  
  const url = `${loginUrl}/login?${params.toString()}`;
  
  return {
    url,
    state,
    codeVerifier: verifier,
  };
}

/**
 * Parse the OAuth callback URL for authorization code and state
 * @param callbackUrl - The full callback URL (or search string)
 * @returns Object with code, state, and any error
 */
export function parseCallbackUrl(callbackUrl: string): {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} {
  const url = new URL(callbackUrl, window.location.origin);
  const params = url.searchParams;
  
  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
    errorDescription: params.get('error_description') || undefined,
  };
}

/**
 * Handle the OAuth callback after user authentication
 * This should be called on your redirect URI page
 * @returns Object with authorization code or error
 */
export function handleCallback(): {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} {
  return parseCallbackUrl(window.location.href);
}

