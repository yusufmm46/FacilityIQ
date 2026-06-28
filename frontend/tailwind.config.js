/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00071b',
        'on-primary': '#ffffff',
        'primary-container': '#0f1f3d',
        secondary: '#006a61',
        'on-surface': '#171c23',
        'on-surface-variant': '#45474e',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff3fe',
        error: '#ba1a1a',
        'status-success': '#2ea056',
        'chart-teal': '#0d9488',
        'chart-blue': '#1d4ed8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
