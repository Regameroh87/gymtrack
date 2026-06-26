import type { Config } from "tailwindcss";
import { ui } from "@gymtrack/core/colors";

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
        // Tokens neutros/de UI del design system (ui-text-main, ui-input-border,
        // ui-background-light, ui-surface-light, …) — espejo de los .web.jsx de Expo.
        ui,
      },
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        manrope: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "card-lg": "22px",
        card: "18px",
        "card-sm": "13px",
        icon: "11px",
        "icon-sm": "9px",
      },
      boxShadow: {
        "card-brand": "0 8px 18px rgba(74,68,228,0.10)",
        "card-hover": "0 12px 28px rgba(74,68,228,0.18)",
        "btn-brand": "0 4px 12px rgba(48,35,205,0.30)",
        "btn-hover": "0 6px 16px rgba(48,35,205,0.38)",
      },
    },
  },
  plugins: [],
};

export default config;
