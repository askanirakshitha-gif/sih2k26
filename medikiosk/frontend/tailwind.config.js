/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kiosk: {
          bg: '#f8fafc',
          card: '#ffffff',
          primary: '#0284c7', // Sky-600
          primaryDark: '#0369a1',
          accent: '#0d9488', // Teal-600
          danger: '#dc2626',
          warning: '#f59e0b',
          success: '#16a34a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
