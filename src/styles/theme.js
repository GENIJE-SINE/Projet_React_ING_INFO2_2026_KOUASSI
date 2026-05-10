// src/styles/theme.js
// Thème Liquid Glass - effet verre dépoli avec écriture noire

import { Platform } from 'react-native';

// Palette de couleurs
export const COLORS = {
  // Fonds
  background: '#E8EFF8',
  backgroundGradientStart: '#D6E4F5',
  backgroundGradientEnd: '#EEF3FB',

  // Verre
  glass: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(200, 220, 245, 0.4)',
  glassShadow: 'rgba(100, 140, 200, 0.15)',

  // Textes
  textPrimary: '#1A1A2E',
  textSecondary: '#4A5568',
  textTertiary: '#8896A8',
  textOnAccent: '#FFFFFF',

  // Accents
  accent: '#2563EB',
  accentLight: 'rgba(37, 99, 235, 0.12)',
  accentGlow: 'rgba(37, 99, 235, 0.25)',

  // États
  success: '#16A34A',
  successBg: 'rgba(22, 163, 74, 0.12)',
  warning: '#B45309',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.12)',

  // Notes (pour la matrice)
  noteRouge: 'rgba(220, 38, 38, 0.15)',
  noteRougeText: '#DC2626',
  noteJaune: 'rgba(245, 158, 11, 0.15)',
  noteJauneText: '#92400E',
  noteVert: 'rgba(22, 163, 74, 0.10)',
  noteVertText: '#166534',
  noteGris: 'rgba(107, 114, 128, 0.08)',
  noteGrisText: '#6B7280',

  // Neutres
  white: '#FFFFFF',
  divider: 'rgba(100, 140, 200, 0.2)',
};

// Effets verre
export const GLASS = {
  // Carte glass standard
  card: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 20,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  // Carte glass petite
  cardSm: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 14,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  // Input glass
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
    borderRadius: 14,
    shadowColor: COLORS.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
};

// Typographie
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary },
  h4: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: COLORS.textSecondary },
  bodyBold: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  caption: { fontSize: 13, fontWeight: '400', color: COLORS.textTertiary },
  captionBold: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
};

// Espacements
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Rayons
export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

// Ombres
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Styles utilitaires communs
export const COMMON = {
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { justifyContent: 'center', alignItems: 'center' },
  flex1: { flex: 1 },
  screenPadding: { paddingHorizontal: SPACING.md },
};