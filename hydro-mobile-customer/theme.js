import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007BFF',
    primaryContainer: '#E3F2FD',
    secondary: '#64748B',
    secondaryContainer: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F6F5',
    background: '#F5F6F5',
    error: '#EF4444',
    errorContainer: '#FECACA',
    success: '#22C55E',
    successContainer: '#DCFCE7',
    warning: '#F59E0B',
    warningContainer: '#FEF3C7',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1F2937',
    onBackground: '#1F2937',
    onError: '#FFFFFF',
    outline: '#D1D5DB',
    outlineVariant: '#E5E7EB',
  },
  fonts: {
    ...MD3LightTheme.fonts,
    default: {
      fontFamily: 'System',
    },
  },
  roundness: 12,
};

export const colors = {
  primary: '#007BFF',
  primaryLight: '#E3F2FD',
  secondary: '#64748B',
  secondaryLight: '#F1F5F9',
  surface: '#FFFFFF',
  background: '#F5F6F5',
  error: '#EF4444',
  errorLight: '#FECACA',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};