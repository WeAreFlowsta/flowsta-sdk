/**
 * Flowsta Auth Widgets
 * Embeddable authentication widgets for partner sites
 * 
 * @packageDocumentation
 */

// Base widget class
export { FlowstaWidget } from './FlowstaWidget';

// Types
export * from './types';

// Components (exported for advanced use cases)
export * from './components';

// Utils (exported for advanced use cases)
export {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  themeToCSSVariables,
  brandingToTheme,
  sanitizeText,
  sanitizeHTML,
  sanitizeEmail,
} from './utils';

// Widgets
export { RecoveryPhraseWidget } from './widgets/RecoveryPhraseWidget';
export { EmailVerificationWidget } from './widgets/EmailVerificationWidget';
export { AccountRecoveryWidget } from './widgets/AccountRecoveryWidget';
export { SecurityDashboardWidget } from './widgets/SecurityDashboardWidget';

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Check if widgets are supported in current browser
 */
export function isSupported(): boolean {
  return !!(
    typeof ShadowRoot === 'function' &&
    document.body.attachShadow &&
    typeof CustomEvent === 'function' &&
    typeof fetch === 'function'
  );
}

