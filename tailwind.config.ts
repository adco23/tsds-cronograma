import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-raised': 'var(--panel-raised)',
        border: 'var(--border)',
        text: 'var(--text)',
        dim: 'var(--text-dim)',
        mute: 'var(--text-mute)',
      },
    },
  },
  plugins: [],
};

export default config;
