// ─── Generador de rampa de color (theme multitenant) ───
// A partir de UN color seed (el theme_primary / theme_accent que define el gym)
// produce los 11 tonos 50–950 que consume el resto de la app, anclando el seed
// EXACTO en el tono 600 (el step de marca principal usado en CTAs/botones).
//
// Los gyms sin theme propio usan las rampas hand-tuned de colors.js (no se
// genera nada). Solo los gyms con theme_primary/theme_accent custom pasan por acá.

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Cuánto "aclarar" hacia blanco (steps < 600) — 0 = seed, 1 = casi blanco.
const LIGHT_FACTOR = {
  50: 0.94,
  100: 0.85,
  200: 0.7,
  300: 0.5,
  400: 0.3,
  500: 0.13,
};
// Cuánto "oscurecer" hacia negro (steps > 600) — 0 = seed, 1 = casi negro.
const DARK_FACTOR = {
  700: 0.12,
  800: 0.28,
  900: 0.42,
  950: 0.62,
};

const NEAR_WHITE_L = 0.985;
const NEAR_BLACK_L = 0.1;

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const lerp = (a, b, t) => a + (b - a) * t;

// ── hex ↔ rgb ───────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
  const to = (n) =>
    Math.round(clamp01(n / 255) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// ── rgb ↔ hsl ─────────────────────────────────────────────────────────────
function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Genera la rampa 50–950 a partir de un hex seed, anclando el seed en 600.
 * @param {string} seedHex - color base (#RRGGBB).
 * @returns {Record<number,string>} objeto { 50: "#..", ..., 950: "#.." }.
 */
export function generateRamp(seedHex) {
  const { h, s, l } = rgbToHsl(hexToRgb(seedHex));
  const ramp = {};
  for (const step of SHADES) {
    if (step === 600) {
      ramp[step] = rgbToHex(hslToRgb({ h, s, l }));
      continue;
    }
    let targetL;
    let targetS = s;
    if (step < 600) {
      const f = LIGHT_FACTOR[step];
      targetL = lerp(l, NEAR_WHITE_L, f);
      // los tonos muy claros se ven más naturales algo menos saturados
      targetS = s * (1 - 0.18 * f);
    } else {
      targetL = lerp(l, NEAR_BLACK_L, DARK_FACTOR[step]);
    }
    ramp[step] = rgbToHex(
      hslToRgb({ h, s: clamp01(targetS), l: clamp01(targetL) })
    );
  }
  return ramp;
}

/**
 * Luminancia relativa WCAG de un hex (0 = negro, 1 = blanco).
 * @param {string} hex
 * @returns {number}
 */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * true si sobre este fondo conviene tinta oscura en vez de blanca. El umbral
 * 0.19 es el punto donde blanco y negro dan el mismo ratio de contraste WCAG.
 * Pensado para elegir la tinta sobre colores de marca custom por gym.
 * @param {string} hex - color de fondo (#RRGGBB).
 * @returns {boolean}
 */
export function prefersDarkInk(hex) {
  return relativeLuminance(hex) > 0.19;
}

/**
 * Convierte un hex a canales "R G B" separados por espacio, para usar en
 * CSS variables con el patrón `rgb(var(--x) / <alpha-value>)`.
 * @param {string} hex
 * @returns {string} ej. "74 68 228"
 */
export function toChannels(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

/**
 * Convierte una rampa { step: hex } a { step: "R G B" } (canales).
 * @param {Record<number,string>} ramp
 * @returns {Record<number,string>}
 */
export function rampToChannels(ramp) {
  const out = {};
  for (const step of Object.keys(ramp)) out[step] = toChannels(ramp[step]);
  return out;
}

export { SHADES };
