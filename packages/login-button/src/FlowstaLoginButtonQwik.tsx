/**
 * Flowsta Login Button - Qwik Component
 * @jsxImportSource @builder.io/qwik
 */

import { component$, useSignal, $, type JSXOutput } from '@builder.io/qwik';
import type { FlowstaLoginConfig, FlowstaLoginSuccess, FlowstaLoginError } from './types.js';
import { buildAuthorizationUrl } from './utils/oauth.js';

export interface FlowstaLoginButtonQwikProps extends FlowstaLoginConfig {
  /** Callback when login succeeds */
  onSuccess$?: (data: FlowstaLoginSuccess) => void;
  
  /** Callback when login fails */
  onError$?: (error: FlowstaLoginError) => void;
  
  /** Callback when button is clicked (before redirect) */
  onClick$?: () => void;
  
  /** Custom CSS class name */
  class?: string;
}

/**
 * Flowsta Login Button component for Qwik
 * 
 * @example
 * ```tsx
 * import { FlowstaLoginButton } from '@flowsta/login-button/qwik';
 * 
 * export default component$(() => {
 *   return (
 *     <FlowstaLoginButton
 *       clientId="your-client-id"
 *       redirectUri="https://yourapp.com/callback"
 *       scopes={['profile', 'email']}
 *       variant="dark-pill"
 *       onSuccess$={(data) => {
 *         console.log('Authorization code:', data.code);
 *       }}
 *       onError$={(error) => {
 *         console.error('Login error:', error);
 *       }}
 *     />
 *   );
 * });
 * ```
 */
export const FlowstaLoginButton = component$<FlowstaLoginButtonQwikProps>((props): JSXOutput => {
  const {
    clientId,
    redirectUri,
    scopes = ['profile'],
    variant = 'dark-pill',
    loginUrl,
    className = '',
    disabled = false,
    onSuccess$,
    onError$,
    onClick$,
  } = props;

  const isLoading = useSignal(false);

  const handleClick = $(async () => {
    if (disabled || isLoading.value) return;

    isLoading.value = true;

    try {
      // Call custom onClick handler if provided
      onClick$?.();

      // Build authorization URL with PKCE
      const { url } = await buildAuthorizationUrl({
        clientId,
        redirectUri,
        scopes,
        loginUrl,
      });

      // Redirect to Flowsta login
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch (error) {
      isLoading.value = false;
      onError$?.({
        error: 'authorization_failed',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get button image path based on variant
  const getImagePath = (variant: string): string => {
    const imageName = `flowsta_signin_web_${variant.replace('-', '_')}`;
    // For bundled use, assume assets are in the package
    return `/node_modules/@flowsta/login-button/assets/svg/${imageName}.svg`;
  };

  return (
    <button
      type="button"
      onClick$={handleClick}
      disabled={disabled || isLoading.value}
      class={`flowsta-login-button ${className || props.class || ''}`}
      aria-label="Sign in with Flowsta"
      style={{
        border: 'none',
        background: 'transparent',
        padding: '0',
        cursor: disabled || isLoading.value ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading.value ? '0.6' : '1',
        transition: 'opacity 0.2s ease',
      }}
    >
      <img
        src={getImagePath(variant)}
        alt="Sign in with Flowsta"
        width={175}
        height={40}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
        }}
      />
    </button>
  );
});

export default FlowstaLoginButton;

