/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'findora-purple': '#6C5CE7',
        'findora-dark': '#1E1B4B',
        'findora-blue': '#3B82F6',
        'findora-green': '#10B981',
        'findora-red': '#EF4444',
        'findora-gray': '#F3F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}