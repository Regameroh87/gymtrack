// Autorización compartida de las rutas de /api/cobranza.
//
// A diferencia de /api/gym-mp (ownerOnly: ahí se conecta la cuenta bancaria del
// gym), acá el pedido del usuario fue owner O admin — mismo criterio que
// MODULE_ROLES.cobranza en @gymtrack/core/roles. lib/gym-mp/authz.ts es la
// referencia de patrón: mismo chequeo con la sesión del usuario (no service
// role), solo que con el rol ampliado.

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";

export interface AdminContext {
  userId: string;
  email: string | null;
  /** id de public.profiles, para las columnas *_by. NO es el user_id de auth. */
  profileId: string | null;
  supabase: SupabaseClient;
}

export type AdminCheck =
  | { ok: true; ctx: AdminContext }
  | { ok: false; status: 401 | 403; error: string };

/** Exige sesión y rol owner o admin activo sobre el gym. */
export async function requireGymAdmin(gymId: string): Promise<AdminCheck> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "No autorizado" };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("gym_id", gymId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (!membership) {
    return {
      ok: false,
      status: 403,
      error: "No tenés permiso para administrar la cobranza de este gimnasio",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    ok: true,
    ctx: {
      userId: user.id,
      email: user.email ?? null,
      profileId: profile?.id ?? null,
      supabase,
    },
  };
}
