/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Design System - Structural Anchor
        navy: '#101B2D',
        // Stitch Design System - Financial Positive (Green)
        green: '#16A36A',
        // Stitch Design System - Background / Surface
        background: '#f9f9ff',
        surface: '#f9f9ff',
        // Stitch Design System - Text
        'primary-text': '#121b2e',
        'secondary-text': '#45474c',
        // Stitch Design System - Border / Outline
        border: '#c5c6cd',
        // Semantic
        success: '#16A36A',
        warning: '#E9A23B',
        danger: '#DC4C4C',
        info: '#3985D6',
        // Stitch MD3 tokens
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f3ff',
        'surface-container': '#e9edff',
        'surface-container-high': '#e1e8ff',
        'surface-container-highest': '#d9e2fc',
        'on-surface-variant': '#45474c',
        'outline': '#75777d',
        'outline-variant': '#c5c6cd',
        'primary-container': '#111c2e',
        'secondary': '#006d44',
        'secondary-container': '#7df7b6',
        'on-secondary-container': '#007147',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'on-surface': '#121b2e',
        'on-background': '#121b2e',
        'error': '#ba1a1a',
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
