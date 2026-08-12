/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F9F4',
        surface: '#FCFDFA',
        text: '#202520',
        muted: 'rgba(32, 37, 32, 0.6)',
        border: 'rgba(32, 37, 32, 0.12)',
        primary: {
          DEFAULT: '#3E7655',
          subtle: 'rgba(62, 118, 85, 0.10)',
        },
        positive: {
          DEFAULT: '#277A55',
          subtle: 'rgba(39, 122, 85, 0.10)',
        },
        negative: {
          DEFAULT: '#B54B47',
          subtle: 'rgba(181, 75, 71, 0.10)',
        },
      },
      borderRadius: {
        'btn': '10px',
        'card': '12px',
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
