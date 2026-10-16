import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FAF6EF', deep: '#F1EADD' },
        sage: { DEFAULT: '#879B83', soft: '#C9D4C5', mist: '#E6ECE2' },
        forest: { DEFAULT: '#344B3F', soft: '#4A6556' },
        peach: { DEFAULT: '#F2C7AD', soft: '#F8E1D2' },
        terracotta: { DEFAULT: '#C8795A', deep: '#A9603F' },
        gold: { DEFAULT: '#D8B56B', soft: '#EFDDB2' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(52,75,63,0.06), 0 8px 24px -8px rgba(52,75,63,0.14)',
        lift: '0 2px 4px rgba(52,75,63,0.08), 0 16px 40px -12px rgba(52,75,63,0.22)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        drift: {
          '0%': { transform: 'translateX(-6%)' },
          '100%': { transform: 'translateX(6%)' },
        },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        drift: 'drift 22s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};

export default config;
