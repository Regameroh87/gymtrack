// Resolución de sesión / rol / gym activo en el SERVIDOR (RSC y server actions).
// Réplica de la lógica de AuthProvider + ActiveGymProvider de Expo, pero leyendo
// con un cliente Supabase por request (cookies). El gym activo se persiste en una
// cookie legible por SSR (análoga al AsyncStorage "active-gym:id" del móvil).

// Librerías
import { cache } from "react";
import { cookies } from "next/headers";
import { type User } from "@supabase/supabase-js";

// Supabase y roles
import { createServerSupabase } from "@/lib/supabase-server";
import { ROLES, isStaffRole, type Role } from "@/lib/auth/roles";

export const ACTIVE_GYM_COOKIE = "active-gym-id";

// ─── Tipos ───
export interface GymEmbed {
  id: string;
  name: string | null;
  logo_url: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  is_active: boolean | null;
}

export interface Membership {
  id: string;
  gym_id: string;
  role: string;
  status: string;
  gyms: GymEmbed | null;
}

export interface Profile {
  id?: string;
  user_id?: string;
  name?: string | null;
  last_name?: string | null;
  email?: string | null;
  is_super_admin?: boolean;
  [key: string]: unknown;
}

export interface GymOption {
  key: string;
  gym_id: string;
  role: string;
  gym: GymEmbed | null;
}

export interface SessionContext {
  authUser: User | null;
  profile: Profile | null;
  isSuperAdmin: boolean;
  // Memberships usables (gym activo, no suspendido). Vacío si no hay sesión.
  memberships: Membership[];
  // Catálogo completo de gyms (solo super_admin, para su selector).
  allGyms: GymEmbed[];
  // Opciones unificadas del selector.
  gymOptions: GymOption[];
  activeGymId: string | null;
  activeGym: GymEmbed | null;
  role: Role | null;
  needsSelection: boolean;
}

// Sesión + perfil del usuario autenticado (o nulls si no hay sesión).
export async function getServerSession(): Promise<{
  authUser: User | null;
  profile: Profile | null;
  isSuperAdmin: boolean;
}> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authUser: null, profile: null, isSuperAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    authUser: user,
    profile: (profile as Profile) ?? null,
    isSuperAdmin: !!profile?.is_super_admin,
  };
}

// Memberships activas con branding del gym embebido. Filtra las suspendidas
// (gyms.is_active === false): el servidor ya las corta por RLS, acá no las
// ofrecemos como gym usable.
async function getUsableMemberships(userId: string): Promise<Membership[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, gym_id, role, status, gyms ( id, name, logo_url, theme_primary, theme_accent, is_active )"
    )
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    console.error("[session] error al leer memberships:", error.message);
    return [];
  }
  const rows = (data as unknown as Membership[]) ?? [];
  return rows.filter((m) => m.gyms?.is_active !== false);
}

// Catálogo completo de gyms (solo para super_admin; RLS gyms_select ya lo permite).
async function getAllGyms(): Promise<GymEmbed[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("gyms")
    .select("id, name, logo_url, theme_primary, theme_accent, is_active")
    .order("name");

  if (error) {
    console.error("[session] error al leer todos los gyms:", error.message);
    return [];
  }
  return (data as GymEmbed[]) ?? [];
}

// Resuelve el gym activo a partir de la cookie. Réplica de la validación de Expo:
//  - super_admin: elige explícito (no se auto-selecciona). Cookie válida contra
//    el catálogo completo, o null.
//  - resto: cookie válida contra memberships usables; con 1 sola, se auto-selecciona;
//    si quedó huérfana, null (fuerza selección).
function resolveActiveGymId(opts: {
  isSuperAdmin: boolean;
  memberships: Membership[];
  allGyms: GymEmbed[];
  cookieValue: string | null;
}): string | null {
  const { isSuperAdmin, memberships, allGyms, cookieValue } = opts;

  if (isSuperAdmin) {
    if (cookieValue && allGyms.some((g) => g.id === cookieValue)) return cookieValue;
    return null;
  }

  if (cookieValue && memberships.some((m) => m.gym_id === cookieValue)) {
    return cookieValue;
  }
  if (memberships.length === 1) return memberships[0].gym_id;
  return null;
}

// Contexto completo de sesión para sembrar los providers cliente y los guards.
// Memoizado por request (React cache): el layout y la page lo comparten sin
// duplicar las consultas a Supabase.
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createServerSupabase();

  // auth.getUser() valida la sesión contra Supabase Auth (es la versión segura).
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      authUser: null,
      profile: null,
      isSuperAdmin: false,
      memberships: [],
      allGyms: [],
      gymOptions: [],
      activeGymId: null,
      activeGym: null,
      role: null,
      needsSelection: false,
    };
  }

  // Perfil y memberships en paralelo: ambos solo dependen del userId, no hay
  // razón para encadenarlos (antes era una cascada secuencial).
  const [profile, memberships] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then((r) => (r.data as Profile) ?? null),
    getUsableMemberships(authUser.id),
  ]);

  const isSuperAdmin = !!profile?.is_super_admin;
  // allGyms depende de isSuperAdmin (que sale del perfil), por eso va después.
  // Solo afecta al super_admin (pocos usuarios); el resto se ahorra la consulta.
  const allGyms = isSuperAdmin ? await getAllGyms() : [];

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_GYM_COOKIE)?.value ?? null;
  const activeGymId = resolveActiveGymId({
    isSuperAdmin,
    memberships,
    allGyms,
    cookieValue,
  });

  // Gym y rol efectivos del gym activo.
  const activeMembership = memberships.find((m) => m.gym_id === activeGymId) ?? null;
  const activeAdminGym =
    isSuperAdmin && activeGymId
      ? (allGyms.find((g) => g.id === activeGymId) ?? null)
      : null;
  const activeGym = activeMembership?.gyms ?? activeAdminGym ?? null;
  const role: Role | null = isSuperAdmin
    ? ROLES.SUPER_ADMIN
    : ((activeMembership?.role as Role) ?? null);

  // Opciones del selector: super_admin sobre todos los gyms; resto, memberships.
  const gymOptions: GymOption[] = isSuperAdmin
    ? allGyms.map((g) => ({ key: g.id, gym_id: g.id, role: ROLES.SUPER_ADMIN, gym: g }))
    : memberships.map((m) => ({ key: m.id, gym_id: m.gym_id, role: m.role, gym: m.gyms }));

  // En web el super_admin NO se fuerza al selector (su home base es /platform).
  // El resto necesita elegir si tiene >1 membership y ninguna activa.
  const needsSelection = isSuperAdmin
    ? false
    : memberships.length > 1 && !activeMembership;

  return {
    authUser,
    profile,
    isSuperAdmin,
    memberships,
    allGyms,
    gymOptions,
    activeGymId,
    activeGym,
    role,
    needsSelection,
  };
});

// Destino post-login según rol/gym (espeja el routing de los layouts de Expo).
export function getPostLoginPath(ctx: SessionContext): string {
  if (!ctx.authUser) return "/login";
  if (ctx.isSuperAdmin) return "/platform";
  if (ctx.needsSelection) return "/select-gym";
  // Staff con gym resuelto → panel del gym. Socio con gym resuelto → su home web.
  // Sin gym usable → selector, que muestra el aviso correspondiente.
  if (ctx.activeGymId && isStaffRole(ctx.role)) return "/admin";
  if (ctx.activeGymId) return "/home";
  return "/select-gym";
}
