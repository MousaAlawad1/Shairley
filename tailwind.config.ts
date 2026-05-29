import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

/**
 * Shairley — شيّرلي
 * Design system: "Enterprise Dark" — Clean, minimal, professional
 *
 * Inspired by Apple, Samsung, Oracle enterprise dashboards.
 * Single accent color (deep indigo-blue), minimal shadows, tight spacing.
 */
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        ink: 'hsl(var(--ink))',
        sheen: 'hsl(var(--sheen))',

        'brand-bg': 'hsl(var(--brand-bg))',
        'brand-card': 'hsl(var(--brand-card))',
        'brand-accent': {
          DEFAULT: 'hsl(var(--brand-accent))',
          hover: 'hsl(var(--brand-accent-hover))',
          ring: 'hsl(var(--brand-accent-ring))',
          muted: 'hsl(var(--brand-accent-muted))',
        },

        'surface-1': 'hsl(var(--surface-1))',
        'surface-2': 'hsl(var(--surface-2))',
        'surface-3': 'hsl(var(--surface-3))',
        'surface-4': 'hsl(var(--surface-4))',

        line: 'hsl(var(--line))',
        'line-strong': 'hsl(var(--line-strong))',

        'fg-1': 'hsl(var(--fg-1))',
        'fg-2': 'hsl(var(--fg-2))',
        'fg-3': 'hsl(var(--fg-3))',
        'fg-4': 'hsl(var(--fg-4))',

        brass: {
          DEFAULT: 'hsl(var(--brass))',
          hover: 'hsl(var(--brass-hover))',
          ring: 'hsl(var(--brass-ring))',
        },
        brick: {
          DEFAULT: 'hsl(var(--brick))',
          soft: 'hsl(var(--brick-soft))',
        },
        sage: 'hsl(var(--sage))',
      },
      fontFamily: {
        sans: [
          '"Noto Kufi Arabic"',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'depth-1': '0 1px 2px rgba(0,0,0,0.3)',
        'depth-2': '0 2px 8px rgba(0,0,0,0.25)',
        'depth-3': '0 8px 24px rgba(0,0,0,0.35)',
        glow: 'none',
        'glow-sm': 'none',
        brass: 'none',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate, typography],
} satisfies Config;