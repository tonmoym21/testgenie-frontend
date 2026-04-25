/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bfd4ff',
          300: '#93b6ff',
          400: '#608fff',
          500: '#3b6bff',
          600: '#254df5',
          700: '#1d3ce0',
          800: '#1e33b4',
          900: '#1f328e',
          950: '#0f1a4d',
        },
        lime: {
          50:  '#f0ffd9',
          100: '#e0ffb3',
          200: '#d0ff8c',
          300: '#c0ff66',
          400: '#99ff33',
          500: '#7DFF00',
          600: '#5dd900',
          700: '#4fa700',
          800: '#3d8600',
          900: '#1a3300',
          950: '#0d1a00',
        },
        surface: {
          50:  '#fafbff',
          100: '#f4f6fb',
          200: '#e7eaf2',
          300: '#d0d5e1',
          400: '#9aa2b3',
          500: '#6b7383',
          600: '#4a5162',
          700: '#363c4c',
          800: '#232838',
          900: '#141826',
          950: '#0a0d18',
        },
      },
      boxShadow: {
        'soft':   '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        'soft-md':'0 4px 10px -2px rgba(16,24,40,0.06), 0 2px 4px -2px rgba(16,24,40,0.04)',
        'soft-lg':'0 12px 30px -8px rgba(16,24,40,0.12), 0 4px 8px -2px rgba(16,24,40,0.04)',
        'glow':   '0 0 0 1px rgba(59,107,255,0.12), 0 8px 24px -6px rgba(59,107,255,0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b6bff 0%, #6a4cff 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, #eef4ff 0%, #f4effe 100%)',
        'gradient-hero': 'radial-gradient(1200px 600px at 0% 0%, rgba(59,107,255,0.15), transparent 60%), radial-gradient(800px 400px at 100% 100%, rgba(106,76,255,0.12), transparent 55%)',
      },
      borderRadius: {
        'xl2': '0.875rem',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: 0 },            '100%': { opacity: 1 } },
        'slide-up':   { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pulse-ring':{ '0%': { boxShadow:'0 0 0 0 rgba(59,107,255,0.45)' }, '100%': { boxShadow:'0 0 0 12px rgba(59,107,255,0)' } },
      },
      animation: {
        'fade-in':  'fade-in 200ms ease-out',
        'slide-up': 'slide-up 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'pulse-ring':'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
