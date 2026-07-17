// Taxonomía de roles: núcleo compartido en @gymtrack/core/roles, más las
// capacidades sobre la ficha de socio que son propias de la app mobile.
// Jerarquía: super_admin › owner › admin › coach › member.

export {
  ROLES,
  STAFF_ROLES,
  ADMIN_ROLES,
  TRAINING_ROLES,
  DEFAULT_ROLE,
  MODULE_ROLES,
  MODULE_PERMISSIONS,
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  isStaffRole,
  isAdminRole,
  isSuperAdminRole,
  canAccessModule,
  unlocksModule,
} from "@gymtrack/core/roles";

import { ROLES, isStaffRole, isAdminRole } from "@gymtrack/core/roles";

// Capacidades sobre la ficha de un alumno (gating por permisos, ACUMULATIVO por
// jerarquía: a más nivel, más capacidades).
//   - coach: entrenamiento (asignar/cambiar plan, ver historial) + contacto en
//     solo-lectura. NO gestiona datos administrativos.
//   - admin/owner/super_admin: lo del coach + administrativo (editar datos, baja).
export const canManageMemberData = (role) => isAdminRole(role);
export const canManageTraining = (role) => isStaffRole(role);
export const canDeleteMember = (role) =>
  [ROLES.SUPER_ADMIN, ROLES.OWNER].includes(role);
