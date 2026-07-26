// Autorización compartida de las rutas de cobros online.
//
// Todo lo de /api/gym-mp toca la cuenta bancaria del gimnasio: conectar, prender
// el cobro, desconectar. Eso es del OWNER y de nadie más — un admin puede
// registrar pagos (PERMISSIONS.PAYMENTS_REGISTER) pero no decidir a qué cuenta
// de MercadoPago va la plata.
//
// El chequeo es el mismo que hace /api/saas/checkout: se consulta memberships
// con la sesión del usuario, no con service role.

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";

export interface OwnerContext {
  userId: string;
  email: string | null;
  /** id de public.profiles, para las columnas *_by. NO es el user_id de auth. */
  profileId: string | null;
  supabase: SupabaseClient;
}

export type OwnerCheck =
  | { ok: true; ctx: OwnerContext }
  | { ok: false; status: 401 | 403; error: string };

/** Exige sesión y rol owner activo sobre el gym. */
export async function requireGymOwner(gymId: string): Promise<OwnerCheck> {
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
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) {
    return { ok: false, status: 403, error: "Solo el dueño del gimnasio puede administrar los cobros" };
  }

  // connected_by referencia profiles(id), no auth.users(id). Se resuelve acá
  // para que las rutas no tengan que acordarse de la diferencia.
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
