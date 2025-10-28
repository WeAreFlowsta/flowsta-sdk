/**
 * Widget Types
 * Core interfaces and types for Flowsta Auth Widgets
 */

import type { Theme, BrandingOptions } from './theme';

/**
 * Base configuration for all widgets
 */
export interface BaseWidgetOptions {
  /** Flowsta client ID (required) */
  clientId: string;
  
  /** Custom theme */
  theme?: Theme;
  
  /** Simplified branding options (alternative to full theme) */
  branding?: BrandingOptions;
  
  /** Function to get current auth token */
  getAuthToken?: () => string | null | Promise<string | null>;
  
  /** API base URL (defaults to https://api.flowsta.com) */
  apiUrl?: string;
  
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Widget lifecycle states
 */
export type WidgetState = 
  | 'initializing'
  | 'ready'
  | 'loading'
  | 'error'
  | 'success'
  | 'destroyed';

/**
 * Widget display modes
 */
export type WidgetDisplayMode = 'modal' | 'inline' | 'banner';

/**
 * Error types
 */
export class WidgetError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WidgetError';
  }
}

/**
 * Common error codes
 */
export const WidgetErrorCodes = {
  INVALID_CLIENT_ID: 'INVALID_CLIENT_ID',
  ORIGIN_NOT_ALLOWED: 'ORIGIN_NOT_ALLOWED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Widget container requirements
 */
export interface WidgetContainer extends HTMLElement {
  attachShadow?(init: ShadowRootInit): ShadowRoot;
  shadowRoot?: ShadowRoot | null;
}

/**
 * Recovery Phrase Widget specific options
 */
export interface RecoveryPhraseWidgetOptions extends BaseWidgetOptions {
  /** Allow user to dismiss without completing */
  allowDismiss?: boolean;
  
  /** Show widget immediately on initialization */
  autoShow?: boolean;
  
  /** Custom messages */
  customMessages?: {
    title?: string;
    description?: string;
    confirmationMessage?: string;
  };
  
  /** Callback when setup is complete and verified */
  onComplete?: (verified: boolean) => void | Promise<void>;
  
  /** Callback when user dismisses without completing */
  onDismiss?: () => void | Promise<void>;
  
  /** Callback when an error occurs */
  onError?: (error: WidgetError) => void | Promise<void>;
}

/**
 * Email Verification Widget specific options
 */
export interface EmailVerificationWidgetOptions extends BaseWidgetOptions {
  /** Display mode */
  mode?: 'banner' | 'modal' | 'inline';
  
  /** Can be dismissed */
  dismissible?: boolean;
  
  /** Seconds before allowing resend (default: 60) */
  autoResendAfter?: number;
  
  /** Callback when email is verified */
  onVerified?: () => void | Promise<void>;
  
  /** Callback when resend is triggered */
  onResend?: () => void | Promise<void>;
  
  /** Callback when dismissed */
  onDismiss?: () => void | Promise<void>;
  
  /** Callback when an error occurs */
  onError?: (error: WidgetError) => void | Promise<void>;
}

/**
 * Account Recovery Widget specific options
 */
export interface AccountRecoveryWidgetOptions extends BaseWidgetOptions {
  /** Pre-fill email address if known */
  email?: string;
  
  /** Callback when recovery is complete */
  onRecoveryComplete?: (success: boolean) => void | Promise<void>;
  
  /** Callback when user cancels */
  onCancel?: () => void | Promise<void>;
  
  /** Callback when an error occurs */
  onError?: (error: WidgetError) => void | Promise<void>;
}

/**
 * Security Dashboard Widget specific options
 */
export interface SecurityDashboardWidgetOptions extends BaseWidgetOptions {
  /** Show recovery phrase status */
  showRecoveryPhrase?: boolean;
  
  /** Show email verification status */
  showEmailVerification?: boolean;
  
  /** Show password change option */
  showPasswordChange?: boolean;
  
  /** Show login history */
  showLoginHistory?: boolean;
  
  /** Callback when user initiates recovery phrase setup */
  onRecoveryPhraseSetup?: () => void | Promise<void>;
  
  /** Callback when user changes password */
  onPasswordChange?: () => void | Promise<void>;
  
  /** Callback when an error occurs */
  onError?: (error: WidgetError) => void | Promise<void>;
}

/**
 * API Response types
 */
export interface ClientValidationResponse {
  valid: boolean;
  clientName: string;
  allowedOrigins: string[];
}

export interface RecoveryPhraseSetupResponse {
  recoveryPhrase: string;
  verificationIndices: number[];
}

export interface RecoveryPhraseStatusResponse {
  hasRecoveryPhrase: boolean;
  verified: boolean;
  createdAt: string | null;
}

export interface EmailVerificationStatusResponse {
  emailVerified: boolean;
  email: string;
}

