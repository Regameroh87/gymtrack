// Estado de los cobros online de un gym: si tiene cuenta de MercadoPago
// conectada y si el interruptor está prendido.
//
// Son dos cosas distintas y se leen de dos lugares distintos a propósito (ver
// la migración 20260726120000): la cuenta vive en gym_mp_accounts y el switch en
// gyms.online_payments_enabled. Se puede tener cuenta con los cobros apagados
// —pausar sin perder el token— pero nunca al revés.
//
// La cuenta se lee por la vista gym_mp_account_status y no por la tabla: los
// grants por columna hacen que un `select *` contra gym_mp_accounts falle con
// permiso denegado, porque los ids de los secretos de Vault no salen para nadie
// que no sea service_role.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export interface GymOnlinePayments {
  /** Hay cuenta de MP vigente (no revocada). */
  connected: boolean;
  /** El owner prendió los cobros. Es lo que mira la app móvil. */
  enabled: boolean;
  mpUserId: string | null;
  connectedAt: string | null;
  /** false = la cuenta conectada es un test user de MercadoPago. */
  liveMode: boolean;
}

export function useGymOnlinePayments(gymId: string | null | undefined) {
  return useQuery({
    queryKey: ["gym_online_payments", gymId],
    enabled: !!gymId,
    staleTime: 30_000,
    queryFn: async (): Promise<GymOnlinePayments> => {
      const supabase = getBrowserSupabase();

      const [gymRes, accountRes] = await Promise.all([
        supabase
          .from("gyms")
          .select("online_payments_enabled")
          .eq("id", gymId!)
          .maybeSingle(),
        supabase
          .from("gym_mp_account_status")
          .select("mp_user_id, live_mode, connected_at, is_connected")
          .eq("gym_id", gymId!)
          .maybeSingle(),
      ]);

      if (gymRes.error) throw gymRes.error;
      if (accountRes.error) throw accountRes.error;

      const account = accountRes.data;

      return {
        connected: account?.is_connected === true,
        enabled: gymRes.data?.online_payments_enabled === true,
        mpUserId: account?.mp_user_id ?? null,
        connectedAt: account?.connected_at ?? null,
        liveMode: account?.live_mode !== false,
      };
    },
  });
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? "Error inesperado");
  }
  return json;
}

/** Prende o apaga los cobros online. */
export function useToggleOnlinePayments(gymId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      postJson("/api/gym-mp/toggle", { gym_id: gymId, enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym_online_payments", gymId] }),
  });
}

/** Desconecta la cuenta de MP. Apaga los cobros como efecto. */
export function useDisconnectMercadoPago(gymId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postJson("/api/gym-mp/disconnect", { gym_id: gymId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym_online_payments", gymId] }),
  });
}
