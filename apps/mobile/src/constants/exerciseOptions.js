export const EXERCISE_CATEGORIES = [
  { label: "Fuerza", value: "fuerza" },
  { label: "Cardio", value: "cardio" },
  { label: "Flexibilidad", value: "flexibilidad" },
  { label: "Potencia", value: "potencia" },
  { label: "Isométrico", value: "isometrico" },
  { label: "Hipertrofia", value: "hipertrofia" },
];

export const EXERCISE_CATEGORY_FILTERS = [
  "Todos",
  ...EXERCISE_CATEGORIES.map((c) => c.label),
];

export const MUSCLE_GROUPS = [
  { label: "Pecho", value: "pecho" },
  { label: "Espalda", value: "espalda" },
  { label: "Deltoides anterior", value: "deltoides_anterior" },
  { label: "Deltoides lateral", value: "deltoides_lateral" },
  { label: "Deltoides posterior", value: "deltoides_posterior" },
  { label: "Bíceps", value: "biceps" },
  { label: "Tríceps", value: "triceps" },
  { label: "Cuádriceps", value: "cuadriceps" },
  { label: "Glúteos", value: "gluteos" },
  { label: "Femorales", value: "femorales" },
  { label: "Gemelos", value: "gemelos" },
  { label: "Tibiales", value: "tibiales" },
  { label: "Aductores", value: "aductores" },
  { label: "Core", value: "core" },
];
