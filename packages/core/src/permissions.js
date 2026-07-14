// Catálogo de permisos de pagos + defaults por rol, espejo exacto de la matriz
// SQL (has_gym_permission en supabase/migrations/20260713121000_...). Fuente
// única para gatear botones en web y mobile: la RLS es la autoridad real, esto
// solo evita mostrar acciones que el backend igual rechazaría.

export const PERMISSIONS = {
  PAYMENTS_REGISTER: "payments.register",
  PAYMENTS_VOID: "payments.void",
};

// owner: todo siempre (no revocable). admin: registra por default, no anula.
// coach/member: nada por default, solo si el owner lo otorgó explícitamente.
const DEFAULT_ROLE_PERMISSIONS = {
  owner: [PERMISSIONS.PAYMENTS_REGISTER, PERMISSIONS.PAYMENTS_VOID],
  admin: [PERMISSIONS.PAYMENTS_REGISTER],
  coach: [],
  member: [],
};

// role: rol de la membership en el gym activo ("owner"/"admin"/"coach"/"member").
// grants: lista de `permission` otorgados explícitamente a esa membership
// (filas de membership_permissions), o null/undefined si aún no cargaron.
export const hasGymPermission = (role, grants, permission) => {
  if (role === "super_admin") return true;
  if (DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission)) return true;
  return !!grants?.includes(permission);
};
