// ROUTINE_OBJECTIVES y ROUTINE_LEVELS se reexportan para no duplicar enums
export {
  ROUTINE_OBJECTIVES as PLAN_OBJECTIVES,
  ROUTINE_LEVELS as PLAN_LEVELS,
} from "./routineOptions";

export const PLAN_STATUSES = [
  { label: "Borrador", value: "draft" },
  { label: "Activo", value: "active" },
  { label: "Archivado", value: "archived" },
];
