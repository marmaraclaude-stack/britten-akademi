import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Britten Akademi marka paleti: mavi + kirmizi vurgu, beyaz zemin, siyah metin
        brand: {
          50: '#eef4ff',
          100: '#dde9fe',
          200: '#c2d8fd',
          300: '#97bcfa',
          400: '#6497f5',
          500: '#3f75ee',
          600: '#2456dd',
          700: '#1c43c0',
          800: '#1c399b',
          900: '#1d327a',
          950: '#0c1636',
        },
        accent: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        surface: '#ffffff',
        plane: '#f4f6fb',
        ink: {
          DEFAULT: '#0a0c12',
          secondary: '#494e5c',
          muted: '#7d8494',
        },
        hairline: '#e2e6ef',
        // Grafik serileri (dataviz paleti)
        chart: {
          blue: '#2456dd',
          aqua: '#1baf7a',
          yellow: '#eda100',
          green: '#008300',
          violet: '#4a3aa7',
          red: '#dc2626',
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
        card: '0 1px 2px rgba(12, 22, 54, 0.05), 0 1px 3px rgba(12, 22, 54, 0.08)',
        raised: '0 4px 12px rgba(12, 22, 54, 0.10), 0 2px 4px rgba(12, 22, 54, 0.06)',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

export default config;
