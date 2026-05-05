// SESSION_OBJECTIVES y SESSION_LEVELS se reexportan para no duplicar enums
export {
  SESSION_OBJECTIVES as PLAN_OBJECTIVES,
  SESSION_LEVELS as PLAN_LEVELS,
} from "./sessionOptions";

export const PLAN_STATUSES = [
  { label: "Borrador", value: "draft" },
  { label: "Activo", value: "active" },
  { label: "Archivado", value: "archived" },
];
