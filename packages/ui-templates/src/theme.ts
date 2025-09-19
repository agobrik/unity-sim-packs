import {
  UITheme,
  ColorPalette,
  ColorVariants,
  Typography,
  SpacingScale,
  ShadowScale,
  BorderRadiusScale,
  AnimationConfig,
  BreakpointConfig,
  ThemeCustomization
} from './types';

export class ThemeManager {
  private themes: Map<string, UITheme> = new Map();
  private activeTheme: UITheme | null = null;
  private customizations: Map<string, ThemeCustomization> = new Map();

  public registerTheme(theme: UITheme): void {
    this.themes.set(theme.name, theme);
  }

  public getTheme(name: string): UITheme | undefined {
    return this.themes.get(name);
  }

  public getAllThemes(): UITheme[] {
    return Array.from(this.themes.values());
  }

  public setActiveTheme(name: string): void {
    const theme = this.themes.get(name);
    if (theme) {
      this.activeTheme = theme;
      this.applyThemeToDocument();
    }
  }

  public getActiveTheme(): UITheme | null {
    return this.activeTheme;
  }

  public customizeTheme(themeName: string, customization: ThemeCustomization): UITheme {
    const baseTheme = this.themes.get(themeName);
    if (!baseTheme) {
      throw new Error(`Theme '${themeName}' not found`);
    }

    this.customizations.set(themeName, customization);
    return this.mergeThemeWithCustomization(baseTheme, customization);
  }

  private mergeThemeWithCustomization(theme: UITheme, customization: ThemeCustomization): UITheme {
    return {
      ...theme,
      colors: customization.colors ? this.mergeColors(theme.colors, customization.colors) : theme.colors,
      typography: customization.typography ? { ...theme.typography, ...customization.typography } : theme.typography,
      spacing: customization.spacing ? { ...theme.spacing, ...customization.spacing } : theme.spacing,
      shadows: customization.shadows ? { ...theme.shadows, ...customization.shadows } : theme.shadows,
      borderRadius: customization.borderRadius ? { ...theme.borderRadius, ...customization.borderRadius } : theme.borderRadius,
      animations: customization.animations ? { ...theme.animations, ...customization.animations } : theme.animations
    };
  }

  private mergeColors(base: ColorPalette, custom: Partial<ColorPalette>): ColorPalette {
    return {
      primary: custom.primary ? { ...base.primary, ...custom.primary } : base.primary,
      secondary: custom.secondary ? { ...base.secondary, ...custom.secondary } : base.secondary,
      success: custom.success ? { ...base.success, ...custom.success } : base.success,
      warning: custom.warning ? { ...base.warning, ...custom.warning } : base.warning,
      error: custom.error ? { ...base.error, ...custom.error } : base.error,
      info: custom.info ? { ...base.info, ...custom.info } : base.info,
      neutral: custom.neutral ? { ...base.neutral, ...custom.neutral } : base.neutral,
      background: custom.background ? { ...base.background, ...custom.background } : base.background,
      surface: custom.surface ? { ...base.surface, ...custom.surface } : base.surface,
      text: custom.text ? { ...base.text, ...custom.text } : base.text
    };
  }

  private applyThemeToDocument(): void {
    if (!this.activeTheme) return;

    const document = (globalThis as any).document;
    if (!document) return;
    const root = document.documentElement;
    const theme = this.activeTheme;

    this.setCSSCustomProperties(root, {
      '--color-primary-main': theme.colors.primary.main,
      '--color-primary-light': theme.colors.primary.light,
      '--color-primary-dark': theme.colors.primary.dark,
      '--color-secondary-main': theme.colors.secondary.main,
      '--color-secondary-light': theme.colors.secondary.light,
      '--color-secondary-dark': theme.colors.secondary.dark,
      '--color-success-main': theme.colors.success.main,
      '--color-warning-main': theme.colors.warning.main,
      '--color-error-main': theme.colors.error.main,
      '--color-info-main': theme.colors.info.main,
      '--color-background-default': theme.colors.background.default,
      '--color-background-paper': theme.colors.background.paper,
      '--color-text-primary': theme.colors.text.primary,
      '--color-text-secondary': theme.colors.text.secondary,
      '--font-family-primary': theme.typography.fontFamily.primary,
      '--font-family-secondary': theme.typography.fontFamily.secondary,
      '--font-size-base': theme.typography.fontSize.base,
      '--spacing-1': theme.spacing['1'],
      '--spacing-2': theme.spacing['2'],
      '--spacing-4': theme.spacing['4'],
      '--spacing-8': theme.spacing['8'],
      '--shadow-base': theme.shadows.base,
      '--border-radius-base': theme.borderRadius.base,
      '--animation-duration-normal': theme.animations.duration.normal
    });
  }

  private setCSSCustomProperties(element: any, properties: Record<string, string>): void {
    Object.entries(properties).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }

  public generateThemeVariables(theme: UITheme): string {
    const variables: string[] = [];

    const addColorVariables = (prefix: string, colors: ColorVariants) => {
      Object.entries(colors).forEach(([key, value]) => {
        variables.push(`--${prefix}-${key}: ${value};`);
      });
    };

    addColorVariables('color-primary', theme.colors.primary);
    addColorVariables('color-secondary', theme.colors.secondary);
    addColorVariables('color-success', theme.colors.success);
    addColorVariables('color-warning', theme.colors.warning);
    addColorVariables('color-error', theme.colors.error);
    addColorVariables('color-info', theme.colors.info);
    addColorVariables('color-gray', theme.colors.neutral.gray);

    Object.entries(theme.colors.background).forEach(([key, value]) => {
      variables.push(`--color-background-${key}: ${value};`);
    });

    Object.entries(theme.colors.text).forEach(([key, value]) => {
      variables.push(`--color-text-${key}: ${value};`);
    });

    Object.entries(theme.typography.fontFamily).forEach(([key, value]) => {
      variables.push(`--font-family-${key}: ${value};`);
    });

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      variables.push(`--font-size-${key}: ${value};`);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables.push(`--spacing-${key}: ${value};`);
    });

    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables.push(`--shadow-${key}: ${value};`);
    });

    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      variables.push(`--border-radius-${key}: ${value};`);
    });

    return `:root {\n  ${variables.join('\n  ')}\n}`;
  }
}

export const createDefaultTheme = (): UITheme => {
  return {
    name: 'Default',
    version: '1.0.0',
    colors: createDefaultColors(),
    typography: createDefaultTypography(),
    spacing: createDefaultSpacing(),
    shadows: createDefaultShadows(),
    borderRadius: createDefaultBorderRadius(),
    animations: createDefaultAnimations(),
    breakpoints: createDefaultBreakpoints()
  };
};

export const createDarkTheme = (): UITheme => {
  const darkTheme = createDefaultTheme();
  darkTheme.name = 'Dark';

  darkTheme.colors = {
    ...darkTheme.colors,
    background: {
      default: '#121212',
      paper: '#1e1e1e',
      elevated: '#2d2d2d',
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    surface: {
      primary: '#1e1e1e',
      secondary: '#2d2d2d',
      tertiary: '#3a3a3a',
      quaternary: '#484848'
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      hint: 'rgba(255, 255, 255, 0.5)'
    }
  };

  return darkTheme;
};

const createDefaultColors = (): ColorPalette => {
  return {
    primary: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
      contrastText: '#ffffff'
    },
    secondary: {
      50: '#fce4ec',
      100: '#f8bbd9',
      200: '#f48fb1',
      300: '#f06292',
      400: '#ec407a',
      500: '#e91e63',
      600: '#d81b60',
      700: '#c2185b',
      800: '#ad1457',
      900: '#880e4f',
      main: '#e91e63',
      light: '#f06292',
      dark: '#c2185b',
      contrastText: '#ffffff'
    },
    success: {
      50: '#e8f5e8',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50',
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff'
    },
    warning: {
      50: '#fff8e1',
      100: '#ffecb3',
      200: '#ffe082',
      300: '#ffd54f',
      400: '#ffca28',
      500: '#ffc107',
      600: '#ffb300',
      700: '#ffa000',
      800: '#ff8f00',
      900: '#ff6f00',
      main: '#ffc107',
      light: '#ffd54f',
      dark: '#ffa000',
      contrastText: '#000000'
    },
    error: {
      50: '#ffebee',
      100: '#ffcdd2',
      200: '#ef9a9a',
      300: '#e57373',
      400: '#ef5350',
      500: '#f44336',
      600: '#e53935',
      700: '#d32f2f',
      800: '#c62828',
      900: '#b71c1c',
      main: '#f44336',
      light: '#ef5350',
      dark: '#d32f2f',
      contrastText: '#ffffff'
    },
    info: {
      50: '#e1f5fe',
      100: '#b3e5fc',
      200: '#81d4fa',
      300: '#4fc3f7',
      400: '#29b6f6',
      500: '#03a9f4',
      600: '#039be5',
      700: '#0288d1',
      800: '#0277bd',
      900: '#01579b',
      main: '#03a9f4',
      light: '#4fc3f7',
      dark: '#0288d1',
      contrastText: '#ffffff'
    },
    neutral: {
      white: '#ffffff',
      black: '#000000',
      gray: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#eeeeee',
        300: '#e0e0e0',
        400: '#bdbdbd',
        500: '#9e9e9e',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
        main: '#9e9e9e',
        light: '#bdbdbd',
        dark: '#616161',
        contrastText: '#ffffff'
      }
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      elevated: '#f5f5f5',
      overlay: 'rgba(0, 0, 0, 0.5)'
    },
    surface: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#eeeeee',
      quaternary: '#e0e0e0'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
      hint: 'rgba(0, 0, 0, 0.5)'
    }
  };
};

const createDefaultTypography = (): Typography => {
  return {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      secondary: 'Georgia, "Times New Roman", serif',
      monospace: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '4rem'
    },
    fontWeight: {
      thin: 100,
      extraLight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
      extraBold: 800,
      black: 900
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    },
    headings: {
      h1: {
        fontSize: '2.25rem',
        fontWeight: 600,
        lineHeight: 1.2
      },
      h2: {
        fontSize: '1.875rem',
        fontWeight: 600,
        lineHeight: 1.3
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.6
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.6
      }
    },
    body: {
      large: {
        fontSize: '1.125rem',
        fontWeight: 400,
        lineHeight: 1.6
      },
      base: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.5
      },
      small: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.4
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.3
      }
    }
  };
};

const createDefaultSpacing = (): SpacingScale => {
  return {
    px: '1px',
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem'
  };
};

const createDefaultShadows = (): ShadowScale => {
  return {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  };
};

const createDefaultBorderRadius = (): BorderRadiusScale => {
  return {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  };
};

const createDefaultAnimations = (): AnimationConfig => {
  return {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '1000ms'
    },
    timing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    transitions: {
      all: 'all 300ms ease-in-out',
      colors: 'color 300ms ease-in-out, background-color 300ms ease-in-out, border-color 300ms ease-in-out',
      opacity: 'opacity 300ms ease-in-out',
      shadow: 'box-shadow 300ms ease-in-out',
      transform: 'transform 300ms ease-in-out'
    }
  };
};

const createDefaultBreakpoints = (): BreakpointConfig => {
  return {
    xs: '0px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    '2xl': '1400px'
  };
};