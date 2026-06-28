import type { Config } from 'tailwindcss';

/**
 * PayCore design tokens.
 * No off-the-shelf UI kit — these tokens back our hand-built component library.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic surface + text scale (CSS vars => runtime theming later)
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--color-surface-2) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--color-fg-subtle) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          fg: 'rgb(var(--color-brand-fg) / <alpha-value>)',
          subtle: 'rgb(var(--color-brand-subtle) / <alpha-value>)',
        },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
      },
      // Tighter radii — subtle, less "bubbly" than the defaults.
      borderRadius: {
        sm: '4px',
        DEFAULT: '5px',
        md: '6px',
        lg: '8px',
        xl: '11px',
      },
      // Soft, low-contrast shadows — separation comes mostly from borders.
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04)',
        pop: '0 2px 8px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04)',
        modal: '0 16px 40px -16px rgb(15 23 42 / 0.22)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
