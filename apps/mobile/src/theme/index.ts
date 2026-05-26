// Mobile design tokens — Light theme + Teal accent (matching reference design)
export const Colors = {
  // Backgrounds
  bgPrimary: '#F4F6F8',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F8FAFC',

  // Primary teal accent
  primary: '#00BFA5',
  primaryLight: '#E0F5F3',
  primaryDark: '#00A38C',

  // Semantic
  success: '#00BFA5',
  successLight: '#E0F5F3',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#E53935',
  dangerLight: '#FFEBEE',
  navy: '#1565C0',
  navyLight: '#E3F2FD',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#757575',
  textMuted: '#BDBDBD',
  textWhite: '#FFFFFF',

  // Border
  border: '#EEEEEE',
  borderDark: '#E0E0E0',

  // Sparklines
  sparkTeal: '#00BFA5',
  sparkNavy: '#1565C0',
  sparkRed: '#E53935',

  // Bottom nav
  navActive: '#00BFA5',
  navInactive: '#BDBDBD',
  navBg: '#FFFFFF',
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
};

export const Radii = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 999,
};

export const Typography = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: Colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700' as const, color: Colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: Colors.textPrimary },
  bodyMd: { fontSize: 14, fontWeight: '500' as const, color: Colors.textPrimary },
  small: { fontSize: 12, fontWeight: '400' as const, color: Colors.textSecondary },
  smallBold: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  number: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary },
  numberLg: { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary },
};

export const Shadows = {
  card: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
};
