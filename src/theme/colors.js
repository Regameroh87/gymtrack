// ─── Design System: "Kinetic Precision" ───
// Based on DESIGN.md — High-Performance Editorial

// ── Brand: Power Indigo ──
export const brandPrimary = {
  50: "#eef0ff",
  100: "#dfe3ff",
  200: "#c5caff",
  300: "#a5b4fc", // ← Indigo-300 (Figma)
  400: "#7e79fc",
  500: "#6366f1", // ← Indigo-500 (buttons, accents)
  600: "#3023cd", // ← Primary (Power Indigo)
  700: "#4a44e4", // ← Primary Container (gradient end)
  800: "#3730a3",
  900: "#312e81",
  950: "#1e1b4b",
};

// ── Tertiary: Pulse Mint ──
export const brandSecondary = {
  50: "#effef9",
  100: "#c9feef",
  200: "#93fce0",
  300: "#62fae3", // ← Pulse Mint (light)
  400: "#2ae8cc",
  500: "#10b981",
  600: "#059669",
  700: "#005047", // ← Pulse Mint (dark)
  800: "#065f46",
  900: "#064e3b",
  950: "#022c22",
};

export const ui = {
  // ── 1. Core Backgrounds & Surfaces ──
  background: {
    light: "#f8f9fc", //chequeado
    dark: "#0C0B14", // chequeado
    primary: "#3023cd", //chequeado
    secondary: "#005047", //chequeado
    tertiary: "#62fae3", //chequeado
  },
  surface: {
    light: "#ffffff", //chequeado
    dark: "#1e1b2e", //chequeado
  },
  surfaceSecondary: {
    light: "#f4f5fa", // ← Alternativa sutil (gris-azulado) para tarjetas secundarias
    dark: "#282542", // ← Elevación extra sobre el surface principal en dark mode
  },
  // ── 2. Typography & Text ──
  text: {
    main: "#0f0d20",
    mainDark: "#f0eef8",
    muted: "#6e6b8a",
    mutedDark: "#64748B", //chequeado
  },
  input: {
    light: "#eae8f4",
    dark: "#2c2847", // ← Elevado y visible (mucho contraste sobre el #1e1b2e)
    border: "rgba(196, 190, 230, 0.15)",
  },
  toggle: {
    offLight: "#e8e6f0",
    offDark: "#231f42",
  },

  placeholder: {
    light: "#6e6b8a", // same as text.muted
    dark: "#334155", // slate-700
  },
};

export const gradient = {
  primary: ["#3023cd", "#4a44e4"],
  previewYoutube: {
    light: ["#c5caff", "#eef0ff"], // brandPrimary 200 → 50
    dark: ["#312e81", "#0f172a"], // indigo-900 → slate-900
  },
  previewVideo: {
    light: ["#c5caff", "#eef0ff"],
    dark: ["#3023cd", "#0f172a"],
  },
  angle: 135,
};
