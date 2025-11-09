/**
 * @flowsta/login-button/vanilla
 * 
 * Vanilla JavaScript implementation for Flowsta login
 * 
 * @packageDocumentation
 */

export { 
  createFlowstaLoginButton, 
  initFlowstaLoginButton,
  default 
} from './FlowstaLoginButtonVanilla.js';

export type { FlowstaLoginButtonVanillaOptions } from './FlowstaLoginButtonVanilla.js';

// Also export utilities and types for convenience
export * from './utils/oauth.js';
export * from './utils/pkce.js';
export * from './utils/state.js';
export * from './types.js';

