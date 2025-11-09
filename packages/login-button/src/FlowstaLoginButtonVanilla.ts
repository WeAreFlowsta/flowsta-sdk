/**
 * Flowsta Login Button - Vanilla JavaScript
 */

import type { FlowstaLoginConfig, FlowstaLoginSuccess, FlowstaLoginError } from './types.js';
import { buildAuthorizationUrl } from './utils/oauth.js';

export interface FlowstaLoginButtonVanillaOptions extends FlowstaLoginConfig {
  /** Callback when login succeeds */
  onSuccess?: (data: FlowstaLoginSuccess) => void;
  
  /** Callback when login fails */
  onError?: (error: FlowstaLoginError) => void;
  
  /** Callback when button is clicked (before redirect) */
  onClick?: () => void;
}

/**
 * Create a Flowsta login button element
 * 
 * @example
 * ```javascript
 * import { createFlowstaLoginButton } from '@flowsta/login-button/vanilla';
 * 
 * const button = createFlowstaLoginButton({
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 *   scopes: ['profile', 'email'],
 *   variant: 'dark-pill',
 *   onSuccess: (data) => {
 *     console.log('Authorization code:', data.code);
 *   },
 *   onError: (error) => {
 *     console.error('Login error:', error);
 *   }
 * });
 * 
 * document.getElementById('login-container').appendChild(button);
 * ```
 */
export function createFlowstaLoginButton(
  options: FlowstaLoginButtonVanillaOptions
): HTMLButtonElement {
  const {
    clientId,
    redirectUri,
    scopes = ['profile'],
    variant = 'dark-pill',
    loginUrl,
    className = '',
    disabled = false,
    onSuccess,
    onError,
    onClick,
  } = options;

  // Create button element
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `flowsta-login-button ${className}`.trim();
  button.setAttribute('aria-label', 'Sign in with Flowsta');
  button.disabled = disabled;

  // Set button styles
  Object.assign(button.style, {
    border: 'none',
    background: 'transparent',
    padding: '0',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? '0.6' : '1',
    transition: 'opacity 0.2s ease',
  });

  // Create image element
  const img = document.createElement('img');
  const imageName = `flowsta_signin_web_${variant.replace('-', '_')}`;
  img.src = `/node_modules/@flowsta/login-button/assets/svg/${imageName}.svg`;
  img.alt = 'Sign in with Flowsta';
  img.width = 175;
  img.height = 40;

  Object.assign(img.style, {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
  });

  button.appendChild(img);

  // Handle click
  let isLoading = false;

  button.addEventListener('click', async () => {
    if (button.disabled || isLoading) return;

    isLoading = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';

    try {
      // Call custom onClick handler if provided
      onClick?.();

      // Build authorization URL with PKCE
      const { url } = await buildAuthorizationUrl({
        clientId,
        redirectUri,
        scopes,
        loginUrl,
      });

      // Redirect to Flowsta login
      window.location.href = url;
    } catch (error) {
      isLoading = false;
      button.style.opacity = disabled ? '0.6' : '1';
      button.style.cursor = disabled ? 'not-allowed' : 'pointer';

      onError?.({
        error: 'authorization_failed',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return button;
}

/**
 * Initialize Flowsta login button in a container element
 * 
 * @example
 * ```javascript
 * import { initFlowstaLoginButton } from '@flowsta/login-button/vanilla';
 * 
 * initFlowstaLoginButton('#login-button-container', {
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 *   scopes: ['profile', 'email'],
 *   variant: 'dark-pill'
 * });
 * ```
 */
export function initFlowstaLoginButton(
  selector: string | HTMLElement,
  options: FlowstaLoginButtonVanillaOptions
): HTMLButtonElement {
  const container = typeof selector === 'string' 
    ? document.querySelector(selector)
    : selector;

  if (!container) {
    throw new Error(`Container not found: ${selector}`);
  }

  const button = createFlowstaLoginButton(options);
  container.appendChild(button);

  return button;
}

export default {
  createFlowstaLoginButton,
  initFlowstaLoginButton,
};

