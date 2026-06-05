// Fuente única de verdad de la taxonomía de roles del sistema.
// Jerarquía: super_admin › owner › admin › coach › member.
// La identidad de tenant se resuelve por gym_id (ver RLS); estos roles definen
// el NIVEL de permiso dentro del gym (salvo super_admin, que es cross-gym).

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  ADMIN: "admin",
  COACH: "coach",
  MEMBER: "member",
};

// Roles con acceso al panel de gestión (/admin). Todo lo que no es alumno.
export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.COACH,
];

// Roles con permisos administrativos plenos del gym (staff, billing, ajustes).
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN];

// Rol por defecto al crear un usuario sin rol explícito.
export const DEFAULT_ROLE = ROLES.MEMBER;

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
export const isSuperAdminRole = (role) => role === ROLES.SUPER_ADMIN;

// Permisos por módulo del panel (clave = `path` de la ruta /admin/<path>).
// Si un módulo no figura, se asume visible para todo el staff.
export const MODULE_ROLES = {
  users: STAFF_ROLES,
  exercises: STAFF_ROLES,
  equipments: STAFF_ROLES,
  sessions: STAFF_ROLES,
  plans: STAFF_ROLES,
  attendance: STAFF_ROLES,
  billing: ADMIN_ROLES,
  reports: ADMIN_ROLES,
  settings: ADMIN_ROLES,
};

export const canAccessModule = (role, path) =>
  (MODULE_ROLES[path] ?? STAFF_ROLES).includes(role);

// Capacidades sobre la ficha de un alumno (gating por permisos, ACUMULATIVO por
// jerarquía: a más nivel, más capacidades).
//   - coach: entrenamiento (asignar/cambiar plan, ver historial) + contacto en
//     solo-lectura. NO gestiona datos administrativos.
//   - admin/owner/super_admin: lo del coach + administrativo (editar datos, baja).
export const canManageMemberData = (role) => isAdminRole(role);
export const canManageTraining = (role) => isStaffRole(role);

// Roles que un rol dado puede asignar al crear/editar usuarios
// (cada rol solo puede asignar roles estrictamente por debajo del suyo).
export const ASSIGNABLE_ROLES = {
  [ROLES.SUPER_ADMIN]: [ROLES.OWNER, ROLES.ADMIN, ROLES.COACH, ROLES.MEMBER],
  [ROLES.OWNER]: [ROLES.ADMIN, ROLES.COACH, ROLES.MEMBER],
  [ROLES.ADMIN]: [ROLES.COACH, ROLES.MEMBER],
  [ROLES.COACH]: [ROLES.MEMBER],
  [ROLES.MEMBER]: [],
};

// Etiquetas legibles para UI.
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.OWNER]: "Dueño",
  [ROLES.ADMIN]: "Administrador",
  [ROLES.COACH]: "Coach",
  [ROLES.MEMBER]: "Socio",
};
