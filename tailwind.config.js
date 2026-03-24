/** @type {import('tailwindcss').Config} */
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
        // Existing
        lexend: ["Lexend_400Regular"],
        "lexend-light": ["Lexend_300Light"],
        "lexend-bold": ["Lexend_700Bold"],
        "lexend-ebold": ["Lexend_800ExtraBold"],
        // Design System: Editorial Typography
        jakarta: ["PlusJakartaSans_700Bold"],
        "jakarta-semi": ["PlusJakartaSans_600SemiBold"],
        manrope: ["Manrope_400Regular"],
        "manrope-semi": ["Manrope_600SemiBold"],
        "manrope-bold": ["Manrope_700Bold"],
      },
      colors: require("./src/theme/colors.js"),
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
