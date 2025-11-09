/**
 * TypeScript types for Flowsta Login Button
 */

/**
 * Available button variants
 */
export type ButtonVariant =
  | 'dark-pill'
  | 'dark-rectangle'
  | 'light-pill'
  | 'light-rectangle'
  | 'neutral-pill'
  | 'neutral-rectangle';

/**
 * OAuth scopes for Flowsta
 */
export type FlowstaScope = 'profile' | 'email';

/**
 * Configuration for the Flowsta login button
 */
export interface FlowstaLoginConfig {
  /** Your Flowsta application client ID (required) */
  clientId: string;
  
  /** The URI to redirect back to after authentication (required) */
  redirectUri: string;
  
  /** OAuth scopes to request (default: ['profile']) */
  scopes?: FlowstaScope[];
  
  /** Button visual variant (default: 'dark-pill') */
  variant?: ButtonVariant;
  
  /** The Flowsta login URL (default: https://login.flowsta.com) */
  loginUrl?: string;
  
  /** Custom CSS class name for the button */
  className?: string;
  
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Callback data after successful authentication
 */
export interface FlowstaLoginSuccess {
  /** Authorization code to exchange for access token */
  code: string;
  
  /** State parameter for validation */
  state: string;
}

/**
 * Error data after failed authentication
 */
export interface FlowstaLoginError {
  /** Error code */
  error: string;
  
  /** Human-readable error description */
  errorDescription?: string;
}

/**
 * Props for React component
 */
export interface FlowstaLoginButtonProps extends FlowstaLoginConfig {
  /** Callback when login succeeds */
  onSuccess?: (data: FlowstaLoginSuccess) => void;
  
  /** Callback when login fails */
  onError?: (error: FlowstaLoginError) => void;
  
  /** Callback when button is clicked (before redirect) */
  onClick?: () => void;
  
  /** Custom button content (overrides default image) */
  children?: React.ReactNode;
}

/**
 * Props for Vue component
 */
export interface VueFlowstaLoginButtonProps extends FlowstaLoginConfig {
  /** Custom button content (overrides default image) */
  customContent?: string;
}

/**
 * Events for Vue component
 */
export interface VueFlowstaLoginButtonEvents {
  /** Emitted when login succeeds */
  success: (data: FlowstaLoginSuccess) => void;
  
  /** Emitted when login fails */
  error: (error: FlowstaLoginError) => void;
  
  /** Emitted when button is clicked (before redirect) */
  click: () => void;
}

