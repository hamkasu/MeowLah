import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TikTok-inspired dark palette
        dark: {
          bg: '#000000',
          card: '#121212',
          surface: '#1a1a1a',
          elevated: '#252525',
          border: '#2a2a2a',
        },
        // Brand colors
        primary: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fad7a5',
          300: '#f6b96d',
          400: '#f19332',
          500: '#ee7a10',
          600: '#df6009',
          700: '#b9470a',
          800: '#933910',
          900: '#773110',
        },
        // TikTok accent colors
        accent: {
          pink: '#fe2c55',
          cyan: '#25f4ee',
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
        memorial: ['Georgia', 'Cambria', 'serif'],
      },
      animation: {
        'candle-flicker': 'flicker 3s ease-in-out infinite',
        'float-up': 'floatUp 2s ease-out forwards',
        'like-pop': 'likePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'slide-up': 'slideUp 0.3s ease-out',
        'heart-float': 'heartFloat 1s ease-out forwards',
        'spin-record': 'spinRecord 3s linear infinite',
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
        likePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        heartFloat: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-80px) scale(1.5)' },
        },
        spinRecord: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
