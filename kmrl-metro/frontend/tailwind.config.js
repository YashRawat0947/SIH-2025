/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'kmrl-blue': '#1e40af',
        'kmrl-green': '#059669',
        'kmrl-red': '#dc2626',
        'kmrl-orange': '#ea580c',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

