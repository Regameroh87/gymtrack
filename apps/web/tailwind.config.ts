import type { Config } from "tailwindcss";

// Tokens del design system "Kinetic Precision" — espejados de
// apps/mobile src/theme/colors.js (Power Indigo + Pulse Mint). La landing de
// marca usa el theme default del SaaS; las páginas por gym sobreescriben
// --brand-primary / --brand-accent en runtime con el branding del gym.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandPrimary: {
          50: "#eef0ff",
          100: "#dfe3ff",
          200: "#c5caff",
          300: "#a5b4fc",
          400: "#7e79fc",
          500: "#6366f1",
          600: "#3023cd",
          700: "#4a44e4",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        brandSecondary: {
          50: "#effef9",
          100: "#c9feef",
          200: "#93fce0",
          300: "#62fae3",
          400: "#2ae8cc",
          500: "#10b981",
          600: "#059669",
          700: "#005047",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        manrope: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
