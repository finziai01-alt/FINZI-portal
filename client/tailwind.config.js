/** @type {import('tailwindcss').Config} */

// ============================================================================
// FINZI AI design tokens.
//
// The colour system below is the COMPLETE Material-style token map taken from
// the Stitch design system (source of truth):
//   stitch_finzi_ai_design_system/stitch_finzi_ai_design_system/
//   finzi_ai_application_shell/code.html
//
// Every token name that token map defines is defined here, with its value
// unchanged. That is the fix: an earlier rewrite of this file dropped the
// "*-container", "*-fixed", "primary" and "secondary" tokens while pages still
// referenced them, so ~430 utility classes compiled to nothing and the UI
// rendered with no canvas tint, no card fills, invisible primary buttons and
// no focus rings. Nothing may be removed from the colour map again.
//
// One deliberate alias: Stitch sets `surface: #f9f9ff` (its canvas colour) and
// `surface-container-lowest: #ffffff` (raised surfaces). The markup in this
// codebase uses `bg-surface` for raised card and input fills, so `surface` is
// aliased to the raised white. Stitch's own canvas value is available as
// `background`, `canvas` and `surface-base`; the true Stitch `surface` value
// is still `background`.
// ============================================================================

// --- Stitch tokens, verbatim -------------------------------------------------
const STITCH = {
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#111c2e',
  onPrimaryContainer: '#79849a',
  primaryFixed: '#d8e3fc',
  onPrimaryFixed: '#111c2e',
  primaryFixedDim: '#bcc7df',
  onPrimaryFixedVariant: '#3c475b',
  inversePrimary: '#bcc7df',

  secondary: '#006d44',
  onSecondary: '#ffffff',
  secondaryContainer: '#7df7b6',
  onSecondaryContainer: '#007147',
  secondaryFixed: '#80fab9',
  onSecondaryFixed: '#002111',
  secondaryFixedDim: '#62dd9e',
  onSecondaryFixedVariant: '#005232',

  tertiary: '#000000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#001c38',
  onTertiaryContainer: '#3b86d7',
  tertiaryFixed: '#d3e4ff',
  onTertiaryFixed: '#001c38',
  tertiaryFixedDim: '#a2c9ff',
  onTertiaryFixedVariant: '#004882',

  surface: '#ffffff', // aliased: raised surface (see header note)
  surfaceBase: '#f9f9ff', // Stitch's own `surface`
  surfaceBright: '#f9f9ff',
  surfaceDim: '#d1daf4',
  surfaceTint: '#545f74',
  surfaceVariant: '#d9e2fc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f3ff',
  surfaceContainer: '#e9edff',
  surfaceContainerHigh: '#e1e8ff',
  surfaceContainerHighest: '#d9e2fc',

  background: '#f9f9ff',
  onBackground: '#121b2e',

  onSurface: '#121b2e',
  onSurfaceVariant: '#45474c',

  outline: '#75777d',
  outlineVariant: '#c5c6cd',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  inverseSurface: '#273044',
  inverseOnSurface: '#edf0ff',
};

// Semantic aliases. The pages are written against these names; they resolve to
// Stitch values so a screen cannot drift from the token system.
const ALIASES = {
  // canvas + surfaces
  canvas: '#f9f9ff',
  sub: '#f1f3ff',
  'sub-2': '#e9edff',
  hover: '#f6f7fd',
  // raised hairline + ink ramp (refined for the airy canvas)
  line: '#e9ebf2',
  'line-strong': '#dcdff0',
  outlineSoft: '#e9ebf2',
  // legacy aliases the pages were written against
  border: '#e9ebf2',
  'primary-text': '#121b2e',
  'secondary-text': '#45474c',
  navy: '#111c2e',
  ink: '#121b2e',
  'ink-2': '#45474c',
  'ink-3': '#75777d',
  'ink-4': '#c5c6cd',
  // accent (Stitch secondary) and its derived shades
  brand: '#006d44',
  'brand-hover': '#005232',
  'brand-press': '#003d27',
  'brand-soft': '#e6f4ec',
  'brand-wash': '#f1f8f4',
  'brand-ring': 'rgba(0,109,68,0.28)',
  'brand-outline': 'rgba(0,109,68,0.24)',
  // panels on the dark shell
  'shell': '#111c2e',
  'shell-2': '#17203a',
  'shell-raise': 'rgba(255,255,255,0.06)',
  'shell-raise-strong': 'rgba(255,255,255,0.12)',
  'shell-line': 'rgba(255,255,255,0.10)',
  'shell-ink': '#edf0ff',
  'shell-ink-2': '#9aa6bd',
  // status tints, each paired with a readable foreground
  green: '#006d44',
  success: '#006d44',
  'green-soft': '#e6f4ec',
  'green-ink': '#005232',
  warning: '#8a5a0b',
  warn: '#8a5a0b',
  'warning-soft': '#fdf3e2',
  'warn-soft': '#fdf3e2',
  'warn-ink': '#7a4f08',
  danger: '#ba1a1a',
  neg: '#ba1a1a',
  errorLegacy: '#ba1a1a',
  'danger-soft': '#fdeceb',
  'neg-soft': '#fdeceb',
  'danger-ink': '#93000a',
  info: '#2a4f9c',
  'info-soft': '#eaf0fb',
  'info-ink': '#25488c',
  'brand-ink': '#005232',
};

// Tailwind v3 resolves a utility class against the literal theme key, so
// `bg-surface-container-low` needs a `surface-container-low` key: camelCase keys
// are not split into class names. Normalise everything to kebab-case once here.
const toKebabKeys = (o) =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(), v])
  );

const COLORS = toKebabKeys({ ...STITCH, ...ALIASES });

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: COLORS,

      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      // Type scale for an Operate surface: many small steps, hierarchy carried
      // by weight and colour rather than by size jumps.
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.01em' }],
        xs: ['11px', { lineHeight: '16px', letterSpacing: '0.012em' }],
        sm: ['12.5px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        md: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        '2xl': ['22px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        '3xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.025em' }],
        // semantic
        display: ['22px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.02em' }],
        title: ['16px', { lineHeight: '22px', fontWeight: '600', letterSpacing: '-0.01em' }],
        metric: ['18px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.015em' }],
        kpi: ['18px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.015em', fontFeatureSettings: '"tnum"' }],
        label: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        micro: ['10px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.08em' }],
        'code-mono': ['11px', { lineHeight: '14px', fontWeight: '500', fontFamily: '"JetBrains Mono", monospace' }],
        'numeric-table': ['12.5px', { lineHeight: '18px', fontWeight: '500', letterSpacing: '-0.005em', fontFeatureSettings: '"tnum"' }],
        // legacy names kept alive
        'body-md': ['13px', { lineHeight: '18px' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        'body-lg': ['14px', { lineHeight: '20px' }],
        'headline-lg': ['22px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.02em' }],
        'headline-md': ['18px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.015em' }],
        'headline-sm': ['15px', { lineHeight: '20px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.02em' }],
        'numeric-kpi': ['18px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.015em', fontFeatureSettings: '"tnum"' }],
      },

      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '18px',
        full: '9999px',
      },

      // Depth carries an offset and a soft blur, never a zero-blur halo.
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px rgba(18,27,46,0.06)',
        sm: '0 1px 2px rgba(18,27,46,0.06)',
        card: '0 1px 2px rgba(18,27,46,0.05), 0 1px 3px rgba(18,27,46,0.03)',
        raise: '0 2px 4px rgba(18,27,46,0.06), 0 4px 10px rgba(18,27,46,0.05)',
        pop: '0 10px 28px -12px rgba(18,27,46,0.22), 0 2px 6px -2px rgba(18,27,46,0.08)',
        modal: '0 24px 60px -20px rgba(18,27,46,0.30), 0 4px 12px rgba(18,27,46,0.06)',
        ring: '0 0 0 3px rgba(0,109,68,0.24)',
        'ring-ink': '0 0 0 3px rgba(18,27,46,0.18)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },

      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '2.5': '0.625rem',
        '3': '0.75rem',
        '3.5': '0.875rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        gutter: '1rem',
        'gutter-dense': '0.5rem',
        margin: '1.5rem',
        'margin-compact': '1rem',
        'space-2xs': '0.125rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'space-2xl': '2rem',
      },

      transitionTimingFunction: {
        swift: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        soft: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },

      transitionDuration: {
        micro: '120ms',
        panel: '200ms',
        page: '220ms',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(-2px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'slide-left': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'draw-line': {
          from: { strokeDasharray: '0 1200', opacity: '0.4' },
          to: { strokeDasharray: '1200 0', opacity: '1' },
        },
      },

      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.23,1,0.32,1) both',
        'fade-in': 'fade-in 180ms cubic-bezier(0.23,1,0.32,1) both',
        'scale-in': 'scale-in 140ms cubic-bezier(0.23,1,0.32,1) both',
        'pop-in': 'pop-in 160ms cubic-bezier(0.23,1,0.32,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'slide-left': 'slide-left 220ms cubic-bezier(0.23,1,0.32,1) both',
        'toast-in': 'toast-in 200ms cubic-bezier(0.23,1,0.32,1) both',
        'spin-slow': 'spin-slow 1s linear infinite',
      },
    },
  },
  plugins: [],
};