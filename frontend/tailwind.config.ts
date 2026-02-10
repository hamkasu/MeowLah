import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fad7a5',
          300: '#f6b96d',
          400: '#f19332',
          500: '#ee7a10',  // Main orange — playful cat energy
          600: '#df6009',
          700: '#b9470a',
          800: '#933910',
          900: '#773110',
        },
        // Memorial garden muted tones
        memorial: {
          50: '#f6f5f0',
          100: '#e8e6d9',
          200: '#d3cfb6',
          300: '#b9b28d',
          400: '#a49a6d',
          500: '#958a5f',
          600: '#807250',
          700: '#685b43',
          800: '#584c3b',
          900: '#4c4236',
        },
        // CatFinder alert tones
        alert: {
          urgent: '#dc2626',
          found: '#16a34a',
          info: '#2563eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        memorial: ['Georgia', 'Cambria', 'serif'], // Elegant serif for memorial pages
      },
      animation: {
        'candle-flicker': 'flicker 3s ease-in-out infinite',
        'float-up': 'floatUp 2s ease-out forwards',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
