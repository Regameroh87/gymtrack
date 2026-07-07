// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Resumen de lo que corresponde pagarle a cada coach del gym en un período
// (RPC coach_payment_summary: fijo + % de ingresos + clases × tarifa). El
// perfil del coach no viene del RPC, se adjunta en un segundo paso (patrón
// use-gym-subscriptions). Admin ve todos; un coach solo su fila (lo filtra el
// propio RPC).
export const useCoachPaymentSummary = (gymId, fromISO, toISO) => {
  return useQuery({
    queryKey: ["coach_payment_summary", gymId, fromISO, toISO],
    enabled: !!gymId && !!fromISO && !!toISO,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_payment_summary", {
        p_gym_id: gymId,
        p_from: fromISO,
        p_to: toISO,
      });
      if (error) throw error;

      const rows = data ?? [];
      if (!rows.length) return [];

      // Adjuntar el perfil del coach (profiles.id = coach_id).
      const coachIds = [...new Set(rows.map((r) => r.coach_id))];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, last_name, image_profile")
        .in("id", coachIds);
      if (pErr) throw pErr;

      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, coach: byId[r.coach_id] ?? null }));
    },
  });
};
