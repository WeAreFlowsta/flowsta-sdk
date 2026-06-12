/**
 * Flowsta Login Button Assets
 * 
 * Industry-standard approach: Ship assets with npm package
 * - Works automatically with all modern bundlers (Vite, Webpack, Parcel, etc.)
 * - Zero configuration required
 * - Falls back to CDN if needed
 * 
 * Usage:
 * ```tsx
 * import { getButtonUrl } from '@flowsta/login-button';
 * 
 * <img src={getButtonUrl('dark', 'pill')} alt="Sign in with Flowsta" />
 * ```
 */

import { BUTTON_DATA_URIS } from './buttonDataUris.js';

export type ButtonTheme = 'dark' | 'light' | 'neutral';
export type ButtonShape = 'pill' | 'rectangle';

/**
 * Get button asset URL
 * 
 * @param theme - 'dark' (for light backgrounds), 'light' (for dark backgrounds), or 'neutral' (for any background)
 * @param shape - 'pill' (rounded) or 'rectangle' (square corners)
 * @returns URL to button SVG
 */
export function getButtonUrl(theme: ButtonTheme, shape: ButtonShape): string {
  // Inline data URI — works in every framework, bundler, script-tag, and
  // SSR context. The previous new URL(import.meta.url) approach compiled
  // to an empty glob map in the built package (assets live outside src/),
  // and /node_modules/... paths 404 in production bundles.
  return BUTTON_DATA_URIS[`${theme}-${shape}`];
}

/**
 * Pre-made button URLs for all combinations
 */
export const BUTTON_URLS = {
  dark: {
    pill: getButtonUrl('dark', 'pill'),
    rectangle: getButtonUrl('dark', 'rectangle'),
  },
  light: {
    pill: getButtonUrl('light', 'pill'),
    rectangle: getButtonUrl('light', 'rectangle'),
  },
  neutral: {
    pill: getButtonUrl('neutral', 'pill'),
    rectangle: getButtonUrl('neutral', 'rectangle'),
  },
} as const;

