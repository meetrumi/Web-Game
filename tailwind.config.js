/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // toggled by adding/removing `dark` on <html> (see ThemeToggle)
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette. Change these three ramps and the whole site re-skins.
        brand: {
          50: '#eef4ff',
          100: '#d9e5ff',
          200: '#bcd0ff',
          300: '#8eb0ff',
          400: '#5985ff',
          500: '#335dff',
          600: '#1d3df5',
          700: '#162ce1',
          800: '#1826b6',
          900: '#1b278f',
        },
        accent: {
          400: '#ffc14d',
          500: '#ffab1a',
          600: '#e08a00',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d8e0',
          300: '#aeb5c3',
          400: '#828ca1',
          500: '#646e85',
          600: '#4f586c',
          700: '#414858',
          800: '#252a35',
          900: '#161a22',
          950: '#0d1015',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,16,21,0.06), 0 8px 24px -12px rgba(13,16,21,0.18)',
        'card-hover': '0 2px 4px rgba(13,16,21,0.08), 0 18px 40px -16px rgba(13,16,21,0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shine: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        shine: 'shine 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
