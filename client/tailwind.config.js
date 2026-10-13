/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: '#F5F7FA',
        card: '#FFFFFF',
        border: '#E4E7EC',
        textPrimary: '#172B4D',
        textSecondary: '#667085',
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: {
          light: '#E6F4EA',
          DEFAULT: '#16856B',
          dark: '#0D5F4C',
        },
        warning: {
          light: '#FEF3C7',
          DEFAULT: '#B7791F',
          dark: '#92400E',
        },
        critical: {
          light: '#FEE2E2',
          DEFAULT: '#C62828',
          dark: '#991B1B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
