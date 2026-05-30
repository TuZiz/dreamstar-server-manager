/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          canvas: '#f4f6f8',
          surface: '#ffffff',
          border: '#d9e0e8',
          text: '#17202a',
          muted: '#667085'
        }
      },
      boxShadow: {
        panel: '0 8px 24px rgba(20, 32, 45, 0.06)'
      }
    }
  },
  plugins: []
};
