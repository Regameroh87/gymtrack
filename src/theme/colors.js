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
    dim: "#1a1730", // ← Superficie más profunda (placeholders sobre dark bg)
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
  // ── Overlays / scrims (modales, sombras base) ──
  overlay: {
    scrim: "rgba(0,0,0,0.6)",
    shadow: "#000000",
    scrimDark: "rgba(12,11,20,0.92)", // overlay oscuro sobre el bg dark (check-in result)
  },
  // ── Estados de feedback ──
  status: {
    success: "#10b981",
    error: "#ef4444",
  },
  // ── Decorativos (tipografía fantasma, marcas de agua) ──
  decor: {
    ghostNumber: {
      light: "rgba(15,13,32,0.04)",
      dark: "rgba(255,255,255,0.05)",
    },
  },
  // ── 3. Colores de íconos SVG (no expresables como clase Tailwind) ──
  icon: {
    onDark: "rgba(255,255,255,0.4)",
    onDarkStrong: "rgba(255,255,255,0.85)",
    onDarkMuted: "rgba(255,255,255,0.35)",
    onLight: "rgba(15,13,32,0.35)",
  },
  // ── Bordes sobre fondos oscuros (inline style, no admiten Tailwind) ──
  border: {
    onDark: "rgba(255,255,255,0.10)",
    onDarkSubtle: "rgba(255,255,255,0.08)",
  },
  arrow: {
    onDark: "rgba(255,255,255,0.65)",
    onLight: "rgba(15,13,32,0.6)",
  },
};

export const gradient = {
  primary: ["#3023cd", "#4a44e4"],
  // ── Degradado de la cabecera del ejercicio (mint → indigo → transparente) ──
  exerciseHeader: {
    light: ["rgba(42,232,204,0.11)", "rgba(74,68,228,0.06)", "rgba(0,0,0,0)"],
    dark: ["rgba(42,232,204,0.18)", "rgba(74,68,228,0.12)", "rgba(0,0,0,0)"],
  },
  previewYoutube: {
    light: ["#c5caff", "#eef0ff"], // brandPrimary 200 → 50
    dark: ["#312e81", "#0f172a"], // indigo-900 → slate-900
  },
  previewVideo: {
    light: ["#c5caff", "#eef0ff"],
    dark: ["#3023cd", "#0f172a"],
  },
  // ── Halos y glows de la home ──
  mintHalo: {
    dark: ["rgba(42,232,204,0.22)", "rgba(42,232,204,0)"],
    light: ["rgba(42,232,204,0.18)", "rgba(42,232,204,0)"],
  },
  primaryHalo: {
    dark: ["rgba(74,68,228,0)", "rgba(74,68,228,0.3)"],
    light: ["rgba(74,68,228,0)", "rgba(74,68,228,0.18)"],
  },
  sessionPlaceholder: {
    dark: ["#0C0B14", "#1e1b4b", "#3023cd"],
    light: ["#eef0ff", "#c5caff", "#7e79fc"],
  },
  // ── Hero de pantalla de perfil ──
  hero: {
    light: ["rgba(74,68,228,0.18)", "rgba(42,232,204,0.10)", "rgba(248,249,252,0)"],
    dark: ["rgba(74,68,228,0.28)", "rgba(42,232,204,0.15)", "rgba(12,11,20,0)"],
  },
  // ── Botón CTA principal ──
  button: {
    primary: ["#6360f0", "#4a44e4", "#3023cd"],
  },
  // ── Fondo sutil de thumbnail sin imagen ──
  cardSubtle: {
    dark: ["#4A44E420", "#2DD4BF10"],
    light: ["#4A44E412", "#2DD4BF08"],
  },
  angle: 135,
};
