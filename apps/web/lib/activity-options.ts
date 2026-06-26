// Opciones para el alta/edición de actividades del gym. Port a TS de
// apps/mobile src/constants/activity-options.js. Colores de dato (hex crudo, no
// tokens de theme) y frecuencias para los pases (activity_plans).

export const ACTIVITY_COLORS = [
  "#4A44E4", // brand primary
  "#2DD4BF", // brand accent
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#7c3aed", // violet
  "#ec4899", // pink
];

export const DEFAULT_ACTIVITY_COLOR = ACTIVITY_COLORS[0];

// `value` es frequency_per_week (null = libre/ilimitado); `label` es el texto
// sugerido para el pase.
export const FREQUENCY_OPTIONS: { value: number | null; label: string }[] = [
  { value: 1, label: "1 vez/semana" },
  { value: 2, label: "2 veces/semana" },
  { value: 3, label: "3 veces/semana" },
  { value: 4, label: "4 veces/semana" },
  { value: 5, label: "5 veces/semana" },
  { value: null, label: "Libre / Ilimitado" },
];
