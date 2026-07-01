// Taxonomía de roles del sistema, portada de apps/mobile/src/constants/roles.js.
// Jerarquía: super_admin › owner › admin › coach › member.
// super_admin es flag global (profiles.is_super_admin); el resto es rol por gym
// (memberships.role). Mantener esta API en paridad con mobile facilita migrar las
// pantallas .web.jsx. (Candidato a extraer a @gymtrack/core más adelante.)

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  // Staff de plataforma (sin gym asociado): espejo de admin/coach de gym pero
  // a nivel /platform. Se guardan como profiles.platform_staff_role ('admin'
  // | 'coach'); estos strings son solo la representación en la app web.
  SUPERADMIN_ADMIN: "superadmin_admin",
  SUPERADMIN_COACH: "superadmin_coach",
  OWNER: "owner",
  ADMIN: "admin",
  COACH: "coach",
  MEMBER: "member",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Rol por defecto al registrar a alguien (portado de constants/roles.js).
export const DEFAULT_ROLE: Role = ROLES.MEMBER;

// Roles que cada rol puede asignar (estrictamente por debajo del suyo). El backend
// (edge function crear-socio) revalida esto. Portado de constants/roles.js.
export const ASSIGNABLE_ROLES: Record<string, Role[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.OWNER, ROLES.ADMIN, ROLES.COACH, ROLES.MEMBER],
  [ROLES.OWNER]: [ROLES.ADMIN, ROLES.COACH, ROLES.MEMBER],
  [ROLES.ADMIN]: [ROLES.COACH, ROLES.MEMBER],
  [ROLES.COACH]: [ROLES.MEMBER],
  [ROLES.MEMBER]: [],
};

// Roles con acceso al panel de gestión (/admin). Todo lo que no es alumno.
export const STAFF_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.COACH,
];

// Roles con permisos administrativos plenos del gym (staff, billing, ajustes).
export const ADMIN_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN];

export const isStaffRole = (role: string | null | undefined): boolean =>
  !!role && STAFF_ROLES.includes(role as Role);
export const isAdminRole = (role: string | null | undefined): boolean =>
  !!role && ADMIN_ROLES.includes(role as Role);
export const isSuperAdminRole = (role: string | null | undefined): boolean =>
  role === ROLES.SUPER_ADMIN;

// Permisos por módulo del panel (clave = `path` de la ruta /admin/<path>).
// Si un módulo no figura, se asume visible para todo el staff.
export const MODULE_ROLES: Record<string, Role[]> = {
  users: STAFF_ROLES,
  exercises: STAFF_ROLES,
  equipments: STAFF_ROLES,
  sessions: STAFF_ROLES,
  plans: STAFF_ROLES,
  attendance: STAFF_ROLES,
  // Define la oferta comercial y los precios ⇒ admin/owner, no coach.
  activities: ADMIN_ROLES,
  billing: ADMIN_ROLES,
  reports: ADMIN_ROLES,
  settings: ADMIN_ROLES,
};

export const canAccessModule = (role: string | null | undefined, path: string): boolean =>
  (MODULE_ROLES[path] ?? STAFF_ROLES).includes(role as Role);

// Etiquetas legibles para UI.
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.SUPERADMIN_ADMIN]: "Admin de plataforma",
  [ROLES.SUPERADMIN_COACH]: "Coach de plataforma",
  [ROLES.OWNER]: "Dueño",
  [ROLES.ADMIN]: "Administrador",
  [ROLES.COACH]: "Coach",
  [ROLES.MEMBER]: "Socio",
};

// ─── Staff de plataforma (/platform) ────────────────────────────────────────
// Espejo de STAFF_ROLES/ADMIN_ROLES/MODULE_ROLES pero para el panel de
// plataforma, sin gym asociado. super_admin sigue siendo el único con bypass
// total de RLS (p.ej. "entrar" a un gym puntual); superadmin_admin/coach solo
// obtienen accesos puntuales (gyms, catálogo, usuarios de plataforma).

export const PLATFORM_STAFF_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.SUPERADMIN_ADMIN,
  ROLES.SUPERADMIN_COACH,
];

export const PLATFORM_ADMIN_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.SUPERADMIN_ADMIN];

// Roles de plataforma que cada rol puede asignar (estrictamente por debajo del
// suyo). Debe mantenerse en sync con ASSIGNABLE en la edge function
// crear-staff-plataforma.
export const PLATFORM_ASSIGNABLE_ROLES: Record<string, Role[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPERADMIN_ADMIN, ROLES.SUPERADMIN_COACH],
  [ROLES.SUPERADMIN_ADMIN]: [ROLES.SUPERADMIN_COACH],
};

// Permisos por módulo del panel de plataforma (clave = path de /platform/<path>).
export const PLATFORM_MODULE_ROLES: Record<string, Role[]> = {
  gyms: PLATFORM_ADMIN_ROLES,
  catalog: PLATFORM_STAFF_ROLES,
  billing: [ROLES.SUPER_ADMIN],
  users: PLATFORM_STAFF_ROLES,
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
  if (profile.platform_staff_role === "admin") return ROLES.SUPERADMIN_ADMIN;
  if (profile.platform_staff_role === "coach") return ROLES.SUPERADMIN_COACH;
  return null;
}
