/**
 * Branding Utilities
 * Theme and branding helper functions
 */

import type { Theme, PartialTheme, BrandingOptions, ThemeColors } from '../types';

/**
 * Default dark theme
 */
export const DEFAULT_DARK_THEME: Theme = {
  colors: {
    primary: '#6366f1', // Indigo
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444',   // Red
    background: '#1f2937', // Gray-800
    text: '#f9fafb',    // Gray-50
    border: '#374151',  // Gray-700
    textMuted: '#9ca3af', // Gray-400
    hover: '#4b5563',   // Gray-600
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      small: '0.875rem',  // 14px
      medium: '1rem',      // 16px
      large: '1.125rem',   // 18px
      xlarge: '1.5rem',    // 24px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    small: '0.5rem',   // 8px
    medium: '1rem',     // 16px
    large: '1.5rem',    // 24px
    xlarge: '2rem',     // 32px
  },
  borderRadius: '0.5rem', // 8px
  shadows: {
    small: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    large: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
};

/**
 * Default light theme
 */
export const DEFAULT_LIGHT_THEME: Theme = {
  ...DEFAULT_DARK_THEME,
  colors: {
    primary: '#6366f1', // Indigo
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444',   // Red
    background: '#ffffff', // White
    text: '#111827',    // Gray-900
    border: '#e5e7eb',  // Gray-200
    textMuted: '#6b7280', // Gray-500
    hover: '#f3f4f6',   // Gray-100
  },
};

/**
 * Merge partial theme with base theme
 */
export function mergeTheme(baseTheme: Theme, partialTheme: PartialTheme): Theme {
  return {
    colors: { ...baseTheme.colors, ...partialTheme.colors },
    typography: { ...baseTheme.typography, ...partialTheme.typography },
    spacing: { ...baseTheme.spacing, ...partialTheme.spacing },
    borderRadius: partialTheme.borderRadius ?? baseTheme.borderRadius,
    shadows: { ...baseTheme.shadows, ...partialTheme.shadows },
  };
}

/**
 * Convert branding options to theme
 */
export function brandingToTheme(branding: BrandingOptions, baseTheme: Theme = DEFAULT_DARK_THEME): Theme {
  if (!branding.brandingColor) {
    return baseTheme;
  }

  return mergeTheme(baseTheme, {
    colors: {
      primary: branding.brandingColor,
    },
  });
}

/**
 * Generate CSS variables from theme
 */
export function themeToCSSVariables(theme: Theme): string {
  const colors = Object.entries(theme.colors)
    .map(([key, value]) => `--flowsta-color-${kebabCase(key)}: ${value};`)
    .join('\n  ');

  const typography = theme.typography
    ? `
  --flowsta-font-family: ${theme.typography.fontFamily || DEFAULT_DARK_THEME.typography!.fontFamily};
  ${theme.typography.fontSize ? Object.entries(theme.typography.fontSize)
    .map(([key, value]) => `--flowsta-font-size-${kebabCase(key)}: ${value};`)
    .join('\n  ') : ''}
  ${theme.typography.fontWeight ? Object.entries(theme.typography.fontWeight)
    .map(([key, value]) => `--flowsta-font-weight-${kebabCase(key)}: ${value};`)
    .join('\n  ') : ''}
  `
    : '';

  const spacing = theme.spacing
    ? Object.entries(theme.spacing)
      .map(([key, value]) => `--flowsta-spacing-${kebabCase(key)}: ${value};`)
      .join('\n  ')
    : '';

  const borderRadius = theme.borderRadius
    ? `--flowsta-border-radius: ${theme.borderRadius};`
    : '';

  const shadows = theme.shadows
    ? Object.entries(theme.shadows)
      .map(([key, value]) => `--flowsta-shadow-${kebabCase(key)}: ${value};`)
      .join('\n  ')
    : '';

  return `:root {
  ${colors}
  ${typography}
  ${spacing}
  ${borderRadius}
  ${shadows}
}`;
}

/**
 * Convert camelCase to kebab-case
 */
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

/**
 * Darken a hex color
 */
export function darkenColor(hex: string, percent: number): string {
  return lightenColor(hex, -percent);
}

