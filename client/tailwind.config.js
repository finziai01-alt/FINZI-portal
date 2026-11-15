/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch MD3 Design System - exact tokens from DESIGN.md
        // Surface colors
        surface: '#f9f9ff',
        'surface-dim': '#d1daf4',
        'surface-bright': '#f9f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f3ff',
        'surface-container': '#e9edff',
        'surface-container-high': '#e1e8ff',
        'surface-container-highest': '#d9e2fc',
        'surface-variant': '#d9e2fc',
        'surface-tint': '#545f74',

        // Background
        background: '#f9f9ff',
        'on-background': '#121b2e',

        // On-surface text
        'on-surface': '#121b2e',
        'on-surface-variant': '#45474c',

        // Inverse
        'inverse-surface': '#273044',
        'inverse-on-surface': '#edf0ff',
        'inverse-primary': '#bcc7df',

        // Outline / borders
        outline: '#75777d',
        'outline-variant': '#c5c6cd',

        // Primary (black per Stitch)
        primary: '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#111c2e',
        'on-primary-container': '#79849a',
        'primary-fixed': '#d8e3fc',
        'primary-fixed-dim': '#bcc7df',
        'on-primary-fixed': '#111c2e',
        'on-primary-fixed-variant': '#3c475b',

        // Secondary / Green (Stitch: #006d44)
        secondary: '#006d44',
        'on-secondary': '#ffffff',
        'secondary-container': '#7df7b6',
        'on-secondary-container': '#007147',
        'secondary-fixed': '#80fab9',
        'secondary-fixed-dim': '#62dd9e',
        'on-secondary-fixed': '#002111',
        'on-secondary-fixed-variant': '#005232',

        // Tertiary
        tertiary: '#000000',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#001c38',
        'on-tertiary-container': '#3b86d7',
        'tertiary-fixed': '#d3e4ff',
        'tertiary-fixed-dim': '#a2c9ff',
        'on-tertiary-fixed': '#001c38',
        'on-tertiary-fixed-variant': '#004882',

        // Error
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        // Legacy aliases for backward compat
        navy: '#000000',
        green: '#006d44',
        'primary-text': '#121b2e',
        'secondary-text': '#45474c',
        border: '#75777d',
        success: '#006d44',
        warning: '#E9A23B',
        danger: '#ba1a1a',
        info: '#3b86d7',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        // Stitch typography scale
        'display': ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.015em' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-sm': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-md': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'numeric-table': ['13px', { lineHeight: '18px', fontWeight: '500', letterSpacing: '-0.005em' }],
        'numeric-kpi': ['24px', { lineHeight: '30px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.02em' }],
        'code-mono': ['11px', { lineHeight: '14px', fontWeight: '500', fontFamily: 'JetBrains Mono, monospace' }],
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        'gutter': '1rem',
        'gutter-dense': '0.5rem',
        'margin': '1.5rem',
        'margin-compact': '1rem',
        'space-2xs': '0.125rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'space-2xl': '2rem',
      },
      borderRadius: {
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
}
