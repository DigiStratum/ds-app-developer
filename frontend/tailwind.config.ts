import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // Scan @digistratum packages for Tailwind classes (compiled JS)
    './node_modules/@digistratum/**/*.{js,mjs}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ds-primary': 'var(--ds-primary)',
        'ds-secondary': 'var(--ds-secondary)',
        'ds-success': 'var(--ds-success)',
        'ds-warning': 'var(--ds-warning)',
        'ds-danger': 'var(--ds-danger)',
        'ds-bg-primary': 'var(--ds-bg-primary)',
        'ds-bg-secondary': 'var(--ds-bg-secondary)',
        'ds-text-primary': 'var(--ds-text-primary)',
        'ds-text-secondary': 'var(--ds-text-secondary)',
        'ds-border': 'var(--ds-border)',
      },
    },
  },
  plugins: [],
}

export default config
