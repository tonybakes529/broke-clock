/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          soft: '#E8C77B',
          deep: '#B8962C',
        },
      },
      boxShadow: {
        gold: '0 0 24px -4px rgba(212, 175, 55, 0.35)',
        emerald: '0 0 24px -4px rgba(16, 185, 129, 0.35)',
      },
    },
  },
  plugins: [],
}
