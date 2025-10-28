/**
 * Theme System Types
 * Defines the theming interface for Flowsta Auth Widgets
 */

export interface ThemeColors {
  /** Primary brand color (e.g., #FF6B35) */
  primary: string;
  /** Secondary accent color */
  secondary?: string;
  /** Success state color */
  success: string;
  /** Warning state color */
  warning: string;
  /** Error state color */
  error: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
  /** Muted text color */
  textMuted?: string;
  /** Hover state color */
  hover?: string;
}

export interface ThemeTypography {
  /** Font family (e.g., 'Inter, sans-serif') */
  fontFamily?: string;
  /** Font sizes */
  fontSize?: {
    small: string;
    medium: string;
    large: string;
    xlarge?: string;
  };
  /** Font weights */
  fontWeight?: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface ThemeSpacing {
  /** Small spacing (e.g., '8px') */
  small: string;
  /** Medium spacing (e.g., '16px') */
  medium: string;
  /** Large spacing (e.g., '24px') */
  large: string;
  /** Extra large spacing (e.g., '32px') */
  xlarge?: string;
}

export interface ThemeShadows {
  /** Small shadow for subtle elevation */
  small: string;
  /** Medium shadow for modals */
  medium: string;
  /** Large shadow for overlays */
  large: string;
}

export interface Theme {
  /** Color palette */
  colors: ThemeColors;
  /** Typography settings */
  typography?: ThemeTypography;
  /** Spacing scale */
  spacing?: ThemeSpacing;
  /** Border radius */
  borderRadius?: string;
  /** Box shadows */
  shadows?: ThemeShadows;
}

/**
 * Partial theme for overriding specific properties
 */
export type PartialTheme = {
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  spacing?: Partial<ThemeSpacing>;
  borderRadius?: string;
  shadows?: Partial<ThemeShadows>;
};

/**
 * Branding options (simplified theme)
 */
export interface BrandingOptions {
  /** Primary brand color */
  brandingColor?: string;
  /** Company/product name */
  companyName?: string;
  /** Company logo URL */
  logoUrl?: string;
  /** Show "Powered by Flowsta" footer */
  showPoweredBy?: boolean;
}

