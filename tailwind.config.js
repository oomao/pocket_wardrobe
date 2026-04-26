/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 'brand' is repurposed to walnut wood tones — every existing
        // bg-brand-* / text-brand-* class automatically picks up the new
        // palette without page-level refactors.
        brand: {
          50:  '#fbf3e3',
          100: '#f3e0bf',
          200: '#e5c08a',
          300: '#cf9a55',
          400: '#b07a3a',
          500: '#8b5a2b',
          600: '#6e4623',
          700: '#56361b',
          800: '#3d2614',
        },
        // Light cream tones for backgrounds & surfaces
        cream: {
          50:  '#fdfaf3',
          100: '#f8f1de',
          200: '#f0e2c2',
          300: '#e6d09a',
        },
        // Light oak accents
        oak: {
          100: '#f0deba',
          200: '#dec07f',
          300: '#c79e4f',
          400: '#9c7a3a',
        },
        // Deep walnut for sidebar / footer surfaces
        walnut: {
          500: '#5b3a1f',
          600: '#472d18',
          700: '#352011',
          800: '#22150b',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans TC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
