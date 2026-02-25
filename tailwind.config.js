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
    },
  },
  plugins: [],
};
