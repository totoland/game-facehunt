import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        void: 'var(--fh-void)',
        surface: 'var(--fh-surface)',
        line: 'var(--fh-line)',
        cyan: 'var(--fh-cyan)',
        magenta: 'var(--fh-magenta)',
        purple: 'var(--fh-purple)',
        success: 'var(--fh-success)',
        warn: 'var(--fh-warn)',
        gold: 'var(--fh-gold)',
        silver: 'var(--fh-silver)',
        bronze: 'var(--fh-bronze)',
        ink: 'var(--fh-ink)',
        muted: 'var(--fh-muted)',
        dim: 'var(--fh-dim)',
      },
    },
  },
  plugins: [],
};

export default config;
