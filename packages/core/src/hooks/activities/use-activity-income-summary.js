// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Ingresos reales por actividad en un período (RPC activity_income_summary):
// cobros de subscription_payments agrupados por actividad, más socios activos.
export const useActivityIncomeSummary = (gymId, fromISO, toISO) => {
  return useQuery({
    queryKey: ["activity_income_summary", gymId, fromISO, toISO],
    enabled: !!gymId && !!fromISO && !!toISO,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("activity_income_summary", {
        p_gym_id: gymId,
        p_from: fromISO,
        p_to: toISO,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
};
