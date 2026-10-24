import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './core/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          cream: 'var(--paper-cream, #F4EEDC)',
          dark: 'var(--paper-cream-dark, #EAE2CB)',
        },
        charcoal: {
          soft: 'var(--soft-charcoal, #3A3A3A)',
        },
        brick: {
          red: 'var(--brick-red, #B5443A)',
        },
        sage: {
          green: 'var(--sage-green, #8FA98A)',
        },
        ink: {
          muted: 'var(--ink-muted, #6B6B6B)',
        },
      },
      fontFamily: {
        mono: ['var(--font-courier-prime)', 'Courier Prime', 'Courier', 'monospace'],
      },
      boxShadow: {
        tactile: '3px 3px 0px var(--soft-charcoal, #3A3A3A)',
        'tactile-sm': '1.5px 1.5px 0px var(--soft-charcoal, #3A3A3A)',
        'tactile-lg': '5px 5px 0px var(--soft-charcoal, #3A3A3A)',
        'tactile-brick': '3px 3px 0px var(--brick-red, #B5443A)',
        'tactile-sage': '3px 3px 0px var(--sage-green, #8FA98A)',
        'tactile-inset': 'inset 2px 2px 0px rgba(58, 58, 58, 0.25)',
      },
      letterSpacing: {
        technical: '0.12em',
      },
      borderRadius: {
        tactile: '3px',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
