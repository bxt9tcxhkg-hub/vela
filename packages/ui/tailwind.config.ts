import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf7f2',
        warm: '#f2ece0',
        sand: '#e8dcc8',
        bark: '#c4a882',
        earth: '#8b6f4e',
        deep: '#2d2218',
        ink: '#1a150e',
        sky: '#5b8fa8',
        'sky-light': '#d4e8f0',
        moss: '#6b8c5a',
        'moss-light': '#daebd2',
        gold: '#c4922a',
        'gold-light': '#faecd0',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        epilogue: ['Epilogue', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
