// Taxonomía de roles del sistema. El núcleo (roles de gym, módulos del panel,
// helpers) vive compartido en @gymtrack/core/roles; acá se re-exporta y se suma
// el bloque de STAFF DE PLATAFORMA (/platform), que solo existe en web.
// Jerarquía: super_admin › owner › admin › coach › member.

// Núcleo compartido con mobile.
export {
  ROLES,
  DEFAULT_ROLE,
  ASSIGNABLE_ROLES,
  STAFF_ROLES,
  ADMIN_ROLES,
  TRAINING_ROLES,
  MODULE_ROLES,
  MODULE_PERMISSIONS,
  canAccessModule,
  unlocksModule,
  isStaffRole,
  isAdminRole,
  isOwnerRole,
  isSuperAdminRole,
} from "@gymtrack/core/roles";

import { ROLES, ROLE_LABELS as GYM_ROLE_LABELS } from "@gymtrack/core/roles";

// Roles de la app (gym) más los pseudo-roles de staff de plataforma, que no son
// roles de membership sino la representación en web de profiles.platform_staff_role.
export type Role =
  | "super_admin"
  | "superadmin_admin"
  | "superadmin_coach"
  | "owner"
  | "admin"
  | "coach"
  | "member";

// ─── Staff de plataforma (/platform) ────────────────────────────────────────
// Espejo de STAFF_ROLES/ADMIN_ROLES/MODULE_ROLES pero para el panel de
// plataforma, sin gym asociado. super_admin sigue siendo el único con bypass
// total de RLS (p.ej. "entrar" a un gym puntual); superadmin_admin/coach solo
// obtienen accesos puntuales (gyms, catálogo, usuarios de plataforma).

export const PLATFORM_ROLES = {
  SUPERADMIN_ADMIN: "superadmin_admin",
  SUPERADMIN_COACH: "superadmin_coach",
} as const;

export const PLATFORM_STAFF_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  PLATFORM_ROLES.SUPERADMIN_ADMIN,
  PLATFORM_ROLES.SUPERADMIN_COACH,
];

export const PLATFORM_ADMIN_ROLES: Role[] = [ROLES.SUPER_ADMIN, PLATFORM_ROLES.SUPERADMIN_ADMIN];

// Roles de plataforma que cada rol puede asignar (estrictamente por debajo del
// suyo). Debe mantenerse en sync con ASSIGNABLE en la edge function
// crear-staff-plataforma.
export const PLATFORM_ASSIGNABLE_ROLES: Record<string, Role[]> = {
  [ROLES.SUPER_ADMIN]: [PLATFORM_ROLES.SUPERADMIN_ADMIN, PLATFORM_ROLES.SUPERADMIN_COACH],
  [PLATFORM_ROLES.SUPERADMIN_ADMIN]: [PLATFORM_ROLES.SUPERADMIN_COACH],
};

// Etiquetas legibles: las de gym (compartidas con mobile) más los pseudo-roles
// de plataforma, que solo se muestran en web.
export const ROLE_LABELS: Record<string, string> = {
  ...GYM_ROLE_LABELS,
  [PLATFORM_ROLES.SUPERADMIN_ADMIN]: "Admin de plataforma",
  [PLATFORM_ROLES.SUPERADMIN_COACH]: "Coach de plataforma",
};

// Permisos por módulo del panel de plataforma (clave = path de /platform/<path>).
// superadmin_coach SOLO opera sobre el catálogo: todo lo demás (dashboard con
// stats de gyms, gestión de gyms, facturación, usuarios globales y ajustes) es
// admin-tier. El único módulo que lo incluye es `catalog`.
export const PLATFORM_MODULE_ROLES: Record<string, Role[]> = {
  // Dashboard de plataforma (path raíz /platform): stats de gyms, no aplica al coach.
  dashboard: PLATFORM_ADMIN_ROLES,
  gyms: PLATFORM_ADMIN_ROLES,
  catalog: PLATFORM_STAFF_ROLES,
  billing: [ROLES.SUPER_ADMIN],
  users: PLATFORM_ADMIN_ROLES,
  settings: PLATFORM_ADMIN_ROLES,
};

export const canAccessPlatformModule = (
  role: string | null | undefined,
  path: string
): boolean => (PLATFORM_MODULE_ROLES[path] ?? PLATFORM_STAFF_ROLES).includes(role as Role);

export const isPlatformStaffRole = (role: string | null | undefined): boolean =>
  !!role && PLATFORM_STAFF_ROLES.includes(role as Role);
export const isPlatformAdminRole = (role: string | null | undefined): boolean =>
  !!role && PLATFORM_ADMIN_ROLES.includes(role as Role);

// Mapea el perfil (is_super_admin + platform_staff_role) al rol de plataforma
// efectivo. Se usa tanto en servidor (session.ts) como en cliente (PlatformShell,
// form de alta) para no duplicar la lógica.
export function resolvePlatformRole(
  profile: { is_super_admin?: boolean | null; platform_staff_role?: string | null } | null | undefined
): Role | null {
  if (!profile) return null;
  if (profile.is_super_admin) return ROLES.SUPER_ADMIN;
  if (profile.platform_staff_role === "admin") return PLATFORM_ROLES.SUPERADMIN_ADMIN;
  if (profile.platform_staff_role === "coach") return PLATFORM_ROLES.SUPERADMIN_COACH;
  return null;
}
