import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Britten Akademi marka paleti — koyu lacivert + altın vurgu
        navy: {
          50: '#f2f6fb',
          100: '#e2ebf6',
          200: '#c7d8ee',
          300: '#9dbce0',
          400: '#6d99cd',
          500: '#4a7bb9',
          600: '#38629e',
          700: '#2f4f80',
          800: '#2a436a',
          900: '#1c2f4d',
          950: '#131f36',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f6eecb',
          200: '#eeda99',
          300: '#e4c15e',
          400: '#dcab35',
          500: '#c9a227',
          600: '#ab791f',
          700: '#89581c',
          800: '#72471e',
          900: '#623c1f',
        },
        surface: '#fcfcfb',
        plane: '#f7f7f4',
        ink: {
          DEFAULT: '#0b0b0b',
          secondary: '#52514e',
          muted: '#898781',
        },
        hairline: '#e1e0d9',
        // Grafik serileri (dataviz paleti — doğrulanmış)
        chart: {
          blue: '#2a78d6',
          aqua: '#1baf7a',
          yellow: '#eda100',
          green: '#008300',
          violet: '#4a3aa7',
          red: '#e34948',
        },
        status: {
          good: '#0ca30c',
          goodtext: '#006300',
          warning: '#fab219',
          serious: '#ec835a',
          critical: '#d03b3b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19, 31, 54, 0.05), 0 1px 3px rgba(19, 31, 54, 0.08)',
        raised: '0 4px 12px rgba(19, 31, 54, 0.10), 0 2px 4px rgba(19, 31, 54, 0.06)',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
