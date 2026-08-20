/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkClass: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#121214',
          800: '#1a1a1e',
          700: '#26262b',
          600: '#34343a',
          500: '#484852'
        },
        brand: {
          500: '#00f2fe',
          600: '#4facfe',
          700: '#00c6ff'
        }
      }
    },
  },
  plugins: [],
}
