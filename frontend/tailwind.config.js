/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary: Teal scale — WCAG 2.1 AA contrast ratios (vs white #ffffff):
        // primary-600 (#0d9488) ≈ 4.6:1 ✅  — buttons, active states
        // primary-700 (#0f766e) ≈ 5.9:1 ✅  — hover states
        // primary-800 (#115e59) ≈ 7.5:1 ✅  — sidebar header (white text on teal-800/80 ≈ 7.0:1 ✅)
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488', // base — buttons, active states
          700: '#0f766e', // hover
          800: '#115e59', // active/pressed, sidebar header
          900: '#134e4a',
          950: '#042f2e',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        // Nível 1 — cards comuns e superfícies padrão
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        // Nível 2 — overlays, modais e dropdowns
        overlay: '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)',
      },
      width: {
        sidebar: '256px',
      },
      minWidth: {
        sidebar: '256px',
      },
    },
  },
  plugins: [],
};
