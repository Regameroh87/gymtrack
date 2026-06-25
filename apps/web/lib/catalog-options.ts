// Opciones de ejercicio del catálogo. Espejo de apps/mobile
// src/constants/exerciseOptions.js para que los selects del catálogo web ofrezcan
// los mismos valores crudos que la app móvil.

export type Option = { label: string; value: string };

export const EXERCISE_CATEGORIES: Option[] = [
  { label: "Fuerza", value: "fuerza" },
  { label: "Cardio", value: "cardio" },
  { label: "Flexibilidad", value: "flexibilidad" },
  { label: "Potencia", value: "potencia" },
];

export const MUSCLE_GROUPS: Option[] = [
  { label: "Pecho", value: "pecho" },
  { label: "Espalda", value: "espalda" },
  { label: "Piernas", value: "piernas" },
  { label: "Hombros", value: "hombros" },
  { label: "Brazos", value: "brazos" },
  { label: "Core", value: "core" },
];

// Objetivos y niveles de plan/sesión (espejo de sessionOptions.js; planOptions los
// reexporta como PLAN_OBJECTIVES / PLAN_LEVELS).
export const PLAN_OBJECTIVES: Option[] = [
  { label: "Hipertrofia", value: "hipertrofia" },
  { label: "Fuerza", value: "fuerza" },
  { label: "Pérdida de grasa", value: "perdida_grasa" },
  { label: "Resistencia", value: "resistencia" },
  { label: "Acondicionamiento", value: "acondicionamiento" },
  { label: "Rehabilitación", value: "rehabilitacion" },
];

export const PLAN_LEVELS: Option[] = [
  { label: "Principiante", value: "principiante" },
  { label: "Intermedio", value: "intermedio" },
  { label: "Avanzado", value: "avanzado" },
];

// Devuelve el label legible de un value crudo; si no hay match usa el value tal cual.
export const labelOf = (options: Option[], value: string | null): string =>
  options.find((o) => o.value === value)?.label ?? value ?? "";
