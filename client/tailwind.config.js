/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefcf5',
          100: '#d7f7e6',
          200: '#b1eed0',
          300: '#7be0b2',
          400: '#40c98f',
          500: '#19ae73',
          600: '#0e8d5b',
          700: '#0c704a',
          800: '#0d593c',
          900: '#0c4933',
        },
      },
    },
  },
  plugins: [],
}

