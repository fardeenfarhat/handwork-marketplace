// Advanced Design System - Orange & Blue Theme
// Based on reference images with sophisticated color palette and gradients

export const Colors = {
  // Primary Orange Palette
  primary: {
    50: '#FFF7F0',
    100: '#FFEDD9',
    200: '#FFD9B3',
    300: '#FFC08A',
    400: '#FF9F56',
    500: '#FF6B35', // Main orange
    600: '#E55A2B',
    700: '#CC4A1F',
    800: '#B33B14',
    900: '#992C0A',
  },

  // Secondary Blue Palette
  secondary: {
    50: '#F0F8FF',
    100: '#E0F1FF',
    200: '#C4E4FF',
    300: '#A8D6FF',
    400: '#7BC3FF',
    500: '#4A90E2', // Main blue
    600: '#3B7BC9',
    700: '#2D66B0',
    800: '#1E5197',
    900: '#0F3C7E',
  },

  // Neutral Palette
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E8E8E8',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic Colors
  success: {
    50: '#F0FDF4',
    500: '#22C55E',
    600: '#16A34A',
  },
  
  warning: {
    50: '#FFFBEB',
    500: '#F59E0B',
    600: '#D97706',
  },
  
  danger: {
    50: '#FEF2F2',
    500: '#EF4444',
    600: '#DC2626',
  },

  // Background & Surface
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F5F5F5',
  },

  // Text Colors
  text: {
    primary: '#171717',
    secondary: '#525252',
    tertiary: '#A3A3A3',
    inverse: '#FFFFFF',
  },
};

// Gradient Definitions
export const Gradients = {
  // Orange gradients
  primaryOrange: ['#FF6B35', '#FF9F56'],
  orangeLight: ['#FFF7F0', '#FFEDD9'],
  orangeSunset: ['#FF6B35', '#FF8A65'],
  orangeWarm: ['#FF9F56', '#FFB74D'],

  // Blue gradients
  primaryBlue: ['#4A90E2', '#7BC3FF'],
  blueLight: ['#F0F8FF', '#E0F1FF'],
  blueCool: ['#2D66B0', '#4A90E2'],
  blueDeep: ['#0F3C7E', '#2D66B0'],

  // Combined gradients
  orangeBlue: ['#FF6B35', '#4A90E2'],
  blueOrange: ['#4A90E2', '#FF6B35'],
  
  // Subtle gradients
  softOrange: ['#FFF7F0', '#FFEDD9', '#FFD9B3'],
  softBlue: ['#F0F8FF', '#E0F1FF', '#C4E4FF'],
  
  // Dark gradients
  darkOrange: ['#992C0A', '#CC4A1F'],
  darkBlue: ['#0F3C7E', '#1E5197'],
};

// Advanced Typography System
export const Typography = {
  // Font families
  fontFamily: {
    primary: 'System', // iOS system font
    secondary: 'System', // Fallback
  },

  // Font sizes with perfect scale
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
  },

  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
    loose: 2.0,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1.0,
  },
};

// Spacing System
export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
};

// Border Radius System
export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Shadow System
export const Shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  base: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Animation Timing
export const Animations = {
  timing: {
    fast: 200,
    base: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
  },
};

// Component Presets
export const ComponentStyles = {
  // Button styles
  button: {
    primary: {
      backgroundColor: Colors.primary[500],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing[4],
      paddingHorizontal: Spacing[6],
      ...Shadows.base,
    },
    secondary: {
      backgroundColor: Colors.secondary[500],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing[4],
      paddingHorizontal: Spacing[6],
      ...Shadows.base,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: Colors.primary[500],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing[4],
      paddingHorizontal: Spacing[6],
    },
  },

  // Card styles
  card: {
    elevated: {
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.xl,
      padding: Spacing[6],
      ...Shadows.lg,
    },
    flat: {
      backgroundColor: Colors.background.secondary,
      borderRadius: BorderRadius.lg,
      padding: Spacing[5],
    },
  },

  // Input styles
  input: {
    default: {
      backgroundColor: Colors.background.primary,
      borderWidth: 1,
      borderColor: Colors.neutral[200],
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing[4],
      paddingHorizontal: Spacing[4],
      fontSize: Typography.fontSize.base,
      color: Colors.text.primary,
    },
    focused: {
      borderColor: Colors.primary[500],
      ...Shadows.sm,
    },
    error: {
      borderColor: Colors.danger[500],
    },
  },
};

export default {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animations,
  ComponentStyles,
};