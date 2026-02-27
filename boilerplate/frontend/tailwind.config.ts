import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ds-primary': '#3b82f6',
        'ds-primary-dark': '#2563eb',
        'ds-secondary': '#64748b',
      },
    },
  },
  plugins: [],
} satisfies Config;
