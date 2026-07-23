// Fuente única de verdad de la taxonomía de roles del sistema, compartida por
// web y mobile. Jerarquía: super_admin › owner › admin › coach › member.
// La identidad de tenant se resuelve por gym_id (ver RLS); estos roles definen
// el NIVEL de permiso dentro del gym (salvo super_admin, que es cross-gym).
//
// Lo específico de cada app (capacidades sobre la ficha de socio en mobile; el
// bloque de staff de plataforma en web) vive en apps/*, que re-exportan esto.

import { PERMISSIONS, hasGymPermission } from "./permissions.js";

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

// Roles que gestionan el CONTENIDO de entrenamiento (ejercicios, máquinas,
// sesiones, planes). Es tarea de owner/coach, no de la administración (admin).
// super_admin se incluye porque opera dentro de un gym como soporte.
export const TRAINING_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.COACH];

// Rol por defecto al crear un usuario sin rol explícito.
export const DEFAULT_ROLE = ROLES.MEMBER;

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
// Solo el dueño del gym (no admin ni super_admin). Se usa para acciones que son
// del titular de la cuenta, como la suscripción/billing SaaS del gym.
export const isOwnerRole = (role) => role === ROLES.OWNER;
export const isSuperAdminRole = (role) => role === ROLES.SUPER_ADMIN;

// Permisos por módulo del panel (clave = `path` de la ruta /admin/<path>).
// Si un módulo no figura, se asume visible para todo el staff.
export const MODULE_ROLES = {
  users: STAFF_ROLES,
  // Contenido de entrenamiento ⇒ owner/coach, no admin (la administración no
  // arma ejercicios/sesiones/planes ni gestiona el inventario de máquinas).
  exercises: TRAINING_ROLES,
  equipments: TRAINING_ROLES,
  sessions: TRAINING_ROLES,
  plans: TRAINING_ROLES,
  attendance: STAFF_ROLES,
  // Agenda de clases: el coach ve sus clases y las marca dictadas; la RLS
  // limita la gestión completa a admin/owner.
  schedule: STAFF_ROLES,
  // Define la oferta comercial y los precios ⇒ admin/owner, no coach.
  activities: ADMIN_ROLES,
  billing: ADMIN_ROLES,
  // Gestión de staff (datos, altas/bajas, permisos) ⇒ admin/owner. Los toggles
  // de permisos puntuales dentro de la ficha siguen siendo solo del owner
  // (gate aparte, ver PermissionsCard en team/[id]).
  team: ADMIN_ROLES,
  reports: ADMIN_ROLES,
  settings: ADMIN_ROLES,
  // Export/import masivo de los datos del gym (web /admin/data).
  data: ADMIN_ROLES,
};

// Permisos que, por sí solos, abren un módulo del panel a quien no lo tiene por
// rol. Es el puente entre membership_permissions y MODULE_ROLES: sin esto un
// grant se otorga pero la persona nunca ve la pantalla donde ejercerlo.
export const MODULE_PERMISSIONS = {
  billing: [PERMISSIONS.PAYMENTS_REGISTER, PERMISSIONS.PAYMENTS_VOID],
};

// ¿Algún grant explícito de la membership abre este módulo, aunque el rol no lo
// incluya? grants: array de permisos otorgados (filas de membership_permissions).
export const unlocksModule = (role, grants, path) =>
  (MODULE_PERMISSIONS[path] ?? []).some((p) => hasGymPermission(role, grants, p));

// Un módulo es accesible si el rol lo incluye O si un grant explícito lo abre.
// grants es opcional: omitirlo conserva el comportamiento solo-por-rol.
export const canAccessModule = (role, path, grants) =>
  (MODULE_ROLES[path] ?? STAFF_ROLES).includes(role) || unlocksModule(role, grants, path);

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
