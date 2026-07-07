// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Historial de pagos hechos a coaches en un período (coach_payments). La RLS
// deja ver todos al admin/owner y solo los propios a un coach. El perfil del
// coach se adjunta en dos pasos (patrón use-gym-subscriptions).
export const useCoachPayments = (gymId, fromISO, toISO) => {
  return useQuery({
    queryKey: ["coach_payments", gymId, fromISO, toISO],
    enabled: !!gymId && !!fromISO && !!toISO,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_payments")
        .select("*")
        .eq("gym_id", gymId)
        .gte("period_start", fromISO)
        .lte("period_start", toISO)
        .order("paid_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      if (!rows.length) return [];

      const coachIds = [...new Set(rows.map((r) => r.coach_id))];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, last_name")
        .in("id", coachIds);
      if (pErr) throw pErr;

      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, coach: byId[r.coach_id] ?? null }));
    },
  });
};
