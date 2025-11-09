/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

/**
 * Generate a random code verifier string
 * Must be 43-128 characters long, using [A-Z][a-z][0-9]-._~
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate a code challenge from a code verifier using SHA-256
 * @param verifier - The code verifier string
 * @returns Promise that resolves to the code challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
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
 * Generate a PKCE pair (verifier and challenge)
 * @returns Promise that resolves to { verifier, challenge }
 */
export async function generatePKCEPair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  return { verifier, challenge };
}

/**
 * Store code verifier in session storage
 * @param verifier - The code verifier to store
 * @param state - The state parameter for correlation
 */
export function storeCodeVerifier(verifier: string, state: string): void {
  try {
    sessionStorage.setItem(`flowsta_code_verifier_${state}`, verifier);
  } catch (error) {
    console.error('Failed to store code verifier:', error);
  }
}

/**
 * Retrieve and remove code verifier from session storage
 * @param state - The state parameter for correlation
 * @returns The code verifier or null if not found
 */
export function retrieveCodeVerifier(state: string): string | null {
  try {
    const verifier = sessionStorage.getItem(`flowsta_code_verifier_${state}`);
    if (verifier) {
      sessionStorage.removeItem(`flowsta_code_verifier_${state}`);
    }
    return verifier;
  } catch (error) {
    console.error('Failed to retrieve code verifier:', error);
    return null;
  }
}

