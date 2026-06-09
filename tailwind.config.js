/** @type {import('tailwindcss').Config} */
const colors = require("./src/theme/colors.js");

// brandPrimary / brandSecondary se vuelven dinámicas por gym vía CSS variables.
// Cada tono apunta a una var con canales "R G B" (definida por defecto en
// global.css :root y sobreescrita en runtime por GymThemeProvider con vars()).
// El patrón rgb(var(--x) / <alpha-value>) preserva las opacidades (bg-...-600/30).
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const varRamp = (name) =>
  Object.fromEntries(
    SHADES.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`])
  );

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Jakarta Family
        jakarta: ["PlusJakartaSans_700Bold"],
        "jakarta-regular": ["PlusJakartaSans_400Regular"],
        "jakarta-light": ["PlusJakartaSans_300Light"],
        "jakarta-bold": ["PlusJakartaSans_700Bold"],
        "jakarta-ebold": ["PlusJakartaSans_800ExtraBold"],
        "jakarta-semi": ["PlusJakartaSans_600SemiBold"],
        manrope: ["Manrope_400Regular"],
        "manrope-semi": ["Manrope_600SemiBold"],
        "manrope-bold": ["Manrope_700Bold"],
      },
      colors: {
        // estáticos (no son marca del gym)
        ui: colors.ui,
        gradient: colors.gradient,
        // marca dinámica por gym vía CSS vars
        brandPrimary: varRamp("brand-primary"),
        brandSecondary: varRamp("brand-secondary"),
      },
      letterSpacing: {
        editorial: "-0.02em", // -2% tracking for display
        label: "0.05em", // +5% tracking for labels
      },
      fontSize: {
        tiny: "10px", // Sin Previsualización, Referencia text, etc.
        xs: "12px", // Labels, inputs
        sm: "14px", // General body text
        base: "16px", // General body
        lg: "18px", // Buttons
        xl: "20px", // Section headers
        "2xl": "24px", // Main headers (Nuevo Ejercicio)
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
