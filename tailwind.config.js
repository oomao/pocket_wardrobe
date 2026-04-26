/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4ff',
          500: '#c026d3',
          600: '#a21caf',
          700: '#86198f',
        },
      },
    },
  },
  plugins: [],
};
