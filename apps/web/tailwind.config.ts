import type { Config } from 'tailwindcss';

/**
 * Thème sombre « premium » d'Arborisis — palette organique (sève, canopée,
 * spores) sur fonds profonds.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canopy: {
          50: '#effdf5',
          100: '#d8f9e6',
          300: '#7eecae',
          400: '#3fd989',
          500: '#16bf6c',
          600: '#0a9a56',
          700: '#0a7a47',
        },
        sap: {
          400: '#f5c96b',
          500: '#e0a93f',
        },
        spore: {
          400: '#9b8cff',
          500: '#7b66f0',
        },
        bark: {
          800: '#11201a',
          850: '#0d1814',
          900: '#0a120f',
          950: '#060b09',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        shake: 'shake 0.5s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(22, 191, 108, 0.2)' },
          '50%': {
            boxShadow: '0 0 40px rgba(22, 191, 108, 0.5), 0 0 60px rgba(22, 191, 108, 0.3)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
