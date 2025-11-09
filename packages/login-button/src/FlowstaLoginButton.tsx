/**
 * Flowsta Login Button - React Component
 */

import React, { useState, useCallback } from 'react';
import type { FlowstaLoginButtonProps } from './types.js';
import { buildAuthorizationUrl } from './utils/oauth.js';

/**
 * Flowsta Login Button component for React
 * 
 * @example
 * ```tsx
 * <FlowstaLoginButton
 *   clientId="your-client-id"
 *   redirectUri="https://yourapp.com/callback"
 *   scopes={['profile', 'email']}
 *   variant="dark-pill"
 *   onSuccess={(data) => {
 *     console.log('Authorization code:', data.code);
 *   }}
 *   onError={(error) => {
 *     console.error('Login error:', error);
 *   }}
 * />
 * ```
 */
export function FlowstaLoginButton({
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
  children,
}: FlowstaLoginButtonProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

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
      setIsLoading(false);
      onError?.({
        error: 'authorization_failed',
        errorDescription: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [clientId, redirectUri, scopes, loginUrl, disabled, isLoading, onClick, onError]);

  // Get button image path based on variant
  const getImagePath = (variant: string): string => {
    const imageName = `flowsta_signin_web_${variant.replace('-', '_')}`;
    // For bundled use, assume assets are in the package
    return `/node_modules/@flowsta/login-button/assets/svg/${imageName}.svg`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`flowsta-login-button ${className}`}
      aria-label="Sign in with Flowsta"
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {children || (
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
      )}
    </button>
  );
}

export default FlowstaLoginButton;

