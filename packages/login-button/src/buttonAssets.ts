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
  const filename = `flowsta_signin_web_${theme}_${shape}.svg`;
  
  // Try to use Vite's asset import (will be resolved at build time)
  try {
    // @ts-ignore - Vite will handle this
    return new URL(`./assets/svg/${filename}`, import.meta.url).href;
  } catch {
    // Fallback to CDN (for non-bundler environments)
    return `https://unpkg.com/@flowsta/login-button@latest/assets/svg/${filename}`;
  }
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

