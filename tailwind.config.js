/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0f',
        'bg-card': '#12121a',
        'bg-card-hover': '#1a1a2e',
        'border-dark': '#1e1e2e',
        'accent-purple': '#7c3aed',
        'accent-green': '#10b981',
        'accent-amber': '#f59e0b',
        'accent-red': '#ef4444',
        'accent-blue': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float-up': 'floatUp 1.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s infinite',
        'count-up': 'countUp 0.5s ease-out',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-60px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px #7c3aed44' },
          '50%': { boxShadow: '0 0 20px #7c3aed88' },
        },
      },
    },
  },
  plugins: [],
};
