/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        youtube: {
          red: '#FF0000',
          darkRed: '#CC0000',
          black: '#0F0F0F',
          card: '#1F1F1F',
          border: '#303030',
          muted: '#AAAAAA'
        }
      }
    },
  },
  plugins: [],
}
