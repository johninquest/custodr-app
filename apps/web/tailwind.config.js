/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F7F4',
        surface: '#FFFFFF',
        text: '#1A1A1A',
        muted: 'rgba(26, 26, 26, 0.6)',
        border: 'rgba(26, 26, 26, 0.12)',
        primary: {
          DEFAULT: '#0044B3',
          subtle: '#EBF2FF',
        },
        positive: {
          DEFAULT: '#116B3E',
          subtle: 'rgba(17, 107, 62, 0.10)',
        },
        negative: {
          DEFAULT: '#B01C33',
          subtle: 'rgba(176, 28, 51, 0.10)',
        },
      },
      borderRadius: {
        'btn': '10px',
        'card': '12px',
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
