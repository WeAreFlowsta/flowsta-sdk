/**
 * @flowsta/login-button
 * 
 * Login with Flowsta button components for React, Vue, and vanilla JavaScript
 * 
 * @packageDocumentation
 */

// Export all utilities
export * from './utils/pkce.js';
export * from './utils/state.js';
export * from './utils/oauth.js';

// Export types
export * from './types.js';

// Re-export for convenience
export { buildAuthorizationUrl, handleCallback, parseCallbackUrl } from './utils/oauth.js';
export { generatePKCEPair, generateCodeVerifier, generateCodeChallenge } from './utils/pkce.js';
export { generateState, validateState } from './utils/state.js';

