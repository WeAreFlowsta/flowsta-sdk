/**
 * State parameter utilities for OAuth 2.0 CSRF protection
 */

/**
 * Generate a random state parameter
 * @returns A random base64url encoded string
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Base64 URL encoding without padding
 * @param buffer - Uint8Array to encode
 * @returns Base64 URL encoded string
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Store state in session storage
 * @param state - The state parameter to store
 */
export function storeState(state: string): void {
  try {
    sessionStorage.setItem('flowsta_oauth_state', state);
  } catch (error) {
    console.error('Failed to store state:', error);
  }
}

/**
 * Retrieve and remove state from session storage
 * @returns The state parameter or null if not found
 */
export function retrieveState(): string | null {
  try {
    const state = sessionStorage.getItem('flowsta_oauth_state');
    if (state) {
      sessionStorage.removeItem('flowsta_oauth_state');
    }
    return state;
  } catch (error) {
    console.error('Failed to retrieve state:', error);
    return null;
  }
}

/**
 * Validate that the returned state matches the stored state
 * @param returnedState - The state returned from OAuth provider
 * @returns true if states match, false otherwise
 */
export function validateState(returnedState: string): boolean {
  const storedState = retrieveState();
  return storedState !== null && storedState === returnedState;
}

