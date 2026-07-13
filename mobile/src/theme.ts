export const colors = {
  background: '#f4f5f9',
  surface: '#ffffff',
  surfaceAlt: '#eef1fb',
  primary: '#3452d9',
  primaryDark: '#24359e',
  primarySoft: '#e4e9fd',
  accent: '#2fae7a',
  danger: '#d9433f',
  warning: '#c98a1f',
  text: '#1c1f2e',
  textMuted: '#6c7189',
  border: '#e2e4ee',
  tabInactive: '#9a9fb5',
  boardLight: '#f0d9b5',
  boardDark: '#b58863',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const typography = {
  title: { fontSize: 22, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
};

export const shadow = {
  card: {
    shadowColor: '#1c1f2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};
