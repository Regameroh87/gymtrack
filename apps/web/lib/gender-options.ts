// Opciones de género — portado de apps/mobile/src/constants/gender-options.js.

export const PLAN_TARGET_GENDERS = [
  { label: "Hombres", value: "hombre" },
  { label: "Mujeres", value: "mujer" },
  { label: "Ambos", value: "ambos" },
];

export const PROFILE_GENDERS = [
  { label: "Hombre", value: "hombre" },
  { label: "Mujer", value: "mujer" },
  { label: "Prefiero no decirlo", value: "prefiero_no_decir" },
];

// Sin entrada para "ambos": en ese caso no se renderiza badge.
export const PLAN_GENDER_BADGES: Record<string, string> = {
  hombre: "Hombres",
  mujer: "Mujeres",
};

// Un member sin género cargado (o que prefiere no decirlo) ve todos los planes.
export const planMatchesGender = (
  plan: { target_gender?: string | null },
  gender: string | null | undefined
) =>
  !gender ||
  gender === "prefiero_no_decir" ||
  !plan.target_gender ||
  plan.target_gender === "ambos" ||
  plan.target_gender === gender;
