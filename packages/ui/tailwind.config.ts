import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark design system
        bg:       '#030712',
        surface:  '#111827',
        surface2: '#1f2937',
        border:   '#374151',
        border2:  '#4b5563',
        vtext:    '#f9fafb',
        vtext2:   '#9ca3af',
        vtext3:   '#6b7280',
        accent:   '#3b82f6',
        accent2:  '#8b5cf6',
        // Legacy aliases (kept for gradual migration)
        cream:    '#111827',
        warm:     '#1f2937',
        sand:     '#374151',
        bark:     '#6b7280',
        earth:    '#9ca3af',
        deep:     '#030712',
        ink:      '#f9fafb',
        sky:      '#3b82f6',
        'sky-light': '#1e3a5f',
        moss:     '#22c55e',
        'moss-light': '#052e16',
        gold:     '#f59e0b',
        'gold-light': '#292524',
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        inter:    ['Inter', 'sans-serif'],
        epilogue: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
