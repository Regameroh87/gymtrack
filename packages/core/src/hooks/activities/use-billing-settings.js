// Política de cobranza de UN gym (lado panel). Por ahora una sola decisión:
// cómo se cobra el primer mes de una membresía que arranca a mitad de mes —
// el mes completo, o la parte proporcional a los días que quedan.
//
// La lectura sale de gyms; la escritura NO va por un update directo: la RLS de
// gyms solo deja escribir a la plataforma, así que el owner pasa por el RPC
// set_billing_settings, que valida rol y toca solo esta columna. Mismo patrón
// que use-training-access-settings.

// React / libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

export const useBillingSettings = (gymId) =>
  useQuery({
    queryKey: ["billing_settings", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("prorate_first_month")
        .eq("id", gymId)
        .maybeSingle();
      if (error) throw error;
      return {
        // Default false: mes completo es lo que hacían todos los gyms antes de
        // que esto fuera configurable.
        prorateFirstMonth: data?.prorate_first_month === true,
      };
    },
  });

export const useSetBillingSettings = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prorateFirstMonth }) => {
      const { error } = await supabase.rpc("set_billing_settings", {
        p_gym_id: gymId,
        p_prorate_first_month: prorateFirstMonth ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing_settings", gymId] });
    },
  });
};
