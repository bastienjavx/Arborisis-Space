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
      },
    },
  },
  plugins: [],
};

export default config;
