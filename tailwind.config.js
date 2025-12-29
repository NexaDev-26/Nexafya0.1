/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Use class-based dark mode
  content: [
    "./index.html",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NexaFya Brand Colors
        nexafya: {
          blue: '#0066CC',
          green: '#00A86B',
          orange: '#FF6B35',
          'blue-light': '#4D94FF',
          'green-light': '#33C18F',
          'orange-light': '#FF8D66',
          // Dark mode specific colors (matching promotional design)
          'dark-bg': '#0A1B2E', // Dark blue background
          'dark-card': '#FFFFFF', // White cards on dark background
          'dark-text': '#E2E8F0', // Light grey text
          'dark-border': '#475569', // Border color for dark mode
        },
        primary: {
          50: '#E6F2FF',
          100: '#B3D9FF',
          200: '#80C0FF',
          300: '#4DA7FF',
          400: '#1A8EFF',
          500: '#0066CC',
          600: '#0052A3',
          700: '#003D7A',
          800: '#002952',
          900: '#001429',
        },
        success: {
          50: '#E6F9F2',
          500: '#00A86B',
          700: '#007A4E',
        },
        warning: {
          50: '#FFF3ED',
          500: '#FF6B35',
          700: '#E65528',
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medical': '0 4px 20px rgba(0, 102, 204, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
