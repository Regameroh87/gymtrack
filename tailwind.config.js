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
        sans: ["Lexend-Regular"],
        lexend: ["Lexend-Regular"],
        "lexend-bold": ["Lexend-Bold"],
        "lexend-light": ["Lexend-Light"],
        "lexend-extrabold": ["Lexend-ExtraBold"],
      },
    },
  },
  plugins: [],
};
