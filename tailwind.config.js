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
        lexend: ["Lexend_400Regular"],
        "lexend-light": ["Lexend_300Light"],
        "lexend-bold": ["Lexend_700Bold"],
        "lexend-ebold": ["Lexend_800ExtraBold"],
      },
      colors: {
        brand: {
          lime: "#bef264", // lime-300 (Acentos)
          primary: "#84cc16", // lime-500 (Botones principales)
          dark: "#4d7c0f", // lime-700 (Estados presionados)
        },
        // INTERFAZ DE USUARIO (SEMÁNTICA)
        ui: {
          // Fondos de pantalla
          background: {
            light: "#f8fafc", // slate-50
            dark: "#020617", // slate-950
          },
          // Tarjetas de ejercicios o usuarios
          card: {
            light: "#ffffff",
            dark: "#0f172a", // slate-900
          },
          // Inputs de texto y formularios
          input: {
            light: "#f1f5f9", // slate-100
            dark: "#1e293b", // slate-800
            border: "#e2e8f0", // slate-200
            borderDark: "#334155", // slate-700
          },
          // Botones secundarios (los grises que hablamos)
          secondary: {
            light: "#e2e8f0", // slate-200
            dark: "#1e293b", // slate-800
            pressedLight: "#cbd5e1", // slate-300
            pressedDark: "#334155", // slate-700
          },
          // Tipografía
          text: {
            main: "#0f172a", // slate-900
            mainDark: "#f1f5f9", // slate-100
            muted: "#64748b", // slate-500
            mutedDark: "#94a3b8", // slate-400
          },
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
