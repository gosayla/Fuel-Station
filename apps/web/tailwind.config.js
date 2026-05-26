/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        // Dark navy base
        bg: {
          primary: '#0F1117',
          secondary: '#1A1D2E',
          tertiary: '#242840',
          card: '#1E2235',
        },
        // Cyan accent (web)
        primary: {
          DEFAULT: '#00D4FF',
          50: '#e0faff',
          100: '#b3f2ff',
          500: '#00D4FF',
          600: '#00B8D9',
          700: '#0099B3',
        },
        // Teal (mobile accent, also used in web secondary)
        teal: {
          DEFAULT: '#00BFA5',
          500: '#00BFA5',
          600: '#00A38C',
        },
        success: { DEFAULT: '#00E676', dark: '#00C853' },
        warning: { DEFAULT: '#FFB300', dark: '#FF8F00' },
        danger: { DEFAULT: '#FF4444', dark: '#D32F2F' },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0AEC0',
          muted: '#64748B',
        },
        border: { DEFAULT: '#2D3250', light: '#3D4470' },
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px rgba(0, 212, 255, 0.15)',
      },
    },
  },
  plugins: [],
};
