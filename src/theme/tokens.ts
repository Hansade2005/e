/**
 * Ez2go design tokens — "Kinetic Transit"
 *
 * A wayfinding / departure-board aesthetic. Ink + Canvas carry the structure;
 * Go-Jade is the brand "go" signal; Signal-Amber is reserved for the single
 * most important action on any screen. Data (fares, ETAs, plates) is rendered
 * in mono so it reads like a meter.
 */

export const colors = {
  // Surfaces
  ink: '#0E1726', // primary text + dark surfaces (the "board")
  inkSoft: '#1B2638', // raised dark surface
  inkLine: '#27344A', // hairline on dark
  canvas: '#F6F7F9', // app background
  surface: '#FFFFFF', // cards
  surfaceAlt: '#EEF1F5', // inset / pressed

  // Brand
  jade: '#00C2A8', // primary "go"
  jadeDark: '#02A892',
  jadeSoft: '#E1F8F4', // jade tint background
  jadeInk: '#0F2A2A', // dark jade-tinted surface (on ink)
  amber: '#FF8A3D', // signal / single hero CTA accent
  amberSoft: '#FFEEE0',

  // Text
  textPrimary: '#0E1726',
  textSecondary: '#5B6472',
  textMuted: '#9AA3B0',
  onInk: '#F6F7F9', // text on dark
  onInkMuted: '#8B97A8',

  // Status
  positive: '#1FB57A',
  warning: '#E8A33D',
  danger: '#E5484D',

  // Map / route
  route: '#0E1726',
  routeShadow: 'rgba(14,23,38,0.18)',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0E1726',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  sheet: {
    shadowColor: '#0E1726',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
  },
  float: {
    shadowColor: '#0E1726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },
  // eyebrow / wayfinding label
  label: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  data: { fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 24 },
  dataLg: { fontFamily: fonts.monoBold, fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
} as const;
