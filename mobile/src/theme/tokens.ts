// Base colors (shared)
export const colors = {
  background: '#0B0F14',
  surface: '#0F141A',
  card: '#111821',
  cardAlt: '#0D131A',
  border: '#1C2530',
  subtle: '#161D26',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#E5E7EB',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  inputBg: '#0C1218',
  inputBorder: '#1E293B',
  handle: '#1E293B'
};

// User mode colors (green theme)
export const userColors = {
  ...colors,
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  primaryLight: '#81C784',
  accent: '#66BB6A',
  chipBg: '#0D1720',
  chipText: '#A7F3D0',
  pillBg: '#05291B',
  pillText: '#34D399',
  cardHighlight: '#0F1F14',
  headerBg: '#0D1710',
};

// Company mode colors (purple/indigo theme)
export const companyColors = {
  ...colors,
  primary: '#7C3AED',
  primaryDark: '#6028C4',
  primaryLight: '#9F7AEA',
  accent: '#8B5CF6',
  chipBg: '#1A1025',
  chipText: '#C4B5FD',
  pillBg: '#1F0A33',
  pillText: '#A78BFA',
  cardHighlight: '#1A1128',
  headerBg: '#130D1F',
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
};

export const typography = {
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  button: { fontWeight: '800', color: '#fff' },
};

// Helper to get colors based on mode
export const getThemeColors = (isCompanyMode: boolean) => {
  return isCompanyMode ? companyColors : userColors;
};
