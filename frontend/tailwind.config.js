/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CareerSim color palette
        'cs-black': '#0A0908',
        'cs-gunmetal': '#22333B',
        'cs-smoke': '#F2F4F3',
        'cs-beaver': '#A9927D',
        'cs-walnut': '#5E503F',
      },
    },
  },
  plugins: [],
}

