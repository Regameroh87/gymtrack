// Política de cobranza de UN gym (lado panel). Dos decisiones:
//
//   prorateFirstMonth  cómo se cobra el primer mes de una membresía que arranca
//                      a mitad de mes: completo, o proporcional a los días que
//                      quedan.
//   dueDayIsCovered    qué pasa el día EXACTO del vencimiento: si ya es deuda o
//                      si todavía está cubierto. Se aplica pareja a la deuda, a
//                      los recordatorios y al badge — que los tres coincidan no
//                      es opinable, cuál de las dos sí.
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
        .select("prorate_first_month, due_day_is_covered")
        .eq("id", gymId)
        .maybeSingle();
      if (error) throw error;
      return {
        // Default false: mes completo es lo que hacían todos los gyms antes de
        // que esto fuera configurable.
        prorateFirstMonth: data?.prorate_first_month === true,
        // Default false: el día del vencimiento ya debe, que es lo que ya hacían
        // la deuda, los meses adeudados de la pantalla y los recordatorios.
        dueDayIsCovered: data?.due_day_is_covered === true,
      };
    },
  });

export const useSetBillingSettings = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Lo que no se manda queda como está (el RPC lo resuelve con COALESCE), así
    // que cada control del panel puede tocar solo lo suyo.
    mutationFn: async ({ prorateFirstMonth, dueDayIsCovered }) => {
      const { error } = await supabase.rpc("set_billing_settings", {
        p_gym_id: gymId,
        p_prorate_first_month: prorateFirstMonth ?? null,
        p_due_day_is_covered: dueDayIsCovered ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing_settings", gymId] });
      // El badge y el contador de vencidas se derivan de esto en cada pantalla
      // que liste inscripciones.
      queryClient.invalidateQueries({ queryKey: ["gym_subscriptions", gymId] });
    },
  });
};
