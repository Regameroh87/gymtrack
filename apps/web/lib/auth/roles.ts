// Taxonomía de roles del sistema, portada de apps/mobile/src/constants/roles.js.
// Jerarquía: super_admin › owner › admin › coach › member.
// super_admin es flag global (profiles.is_super_admin); el resto es rol por gym
// (memberships.role). Mantener esta API en paridad con mobile facilita migrar las
// pantallas .web.jsx. (Candidato a extraer a @gymtrack/core más adelante.)

export const ROLES = {
  SUPER_ADMIN: "super_admin",
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
  [ROLES.OWNER]: "Dueño",
  [ROLES.ADMIN]: "Administrador",
  [ROLES.COACH]: "Coach",
  [ROLES.MEMBER]: "Socio",
};
