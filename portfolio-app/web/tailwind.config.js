/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          950: '#05070D',
          900: '#0a0e1a',
          850: '#0d1220',
          800: '#111827',
          700: '#1b2333',
        },
        accent: {
          DEFAULT: '#3B82F6',
          soft: '#60A5FA',
          dim: '#1E3A5F',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
