// Política de cobranza de UN gym (lado panel). Una decisión:
//
//   dueDayIsCovered  qué pasa el día EXACTO del vencimiento: si ya es deuda o si
//                    todavía está cubierto. Se aplica pareja a la deuda, a los
//                    recordatorios y al badge — que los tres coincidan no es
//                    opinable, cuál de las dos sí.
//
// Acá vivía también el prorrateo del primer mes. Se fue con el pase a cobranza
// por aniversario: el primer ciclo va del día del alta al mismo día del mes
// siguiente, o sea que siempre es un mes completo y no hay nada que prorratear.
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
        .select("due_day_is_covered")
        .eq("id", gymId)
        .maybeSingle();
      if (error) throw error;
      return {
        // Default false: el día del vencimiento ya debe, que es lo que ya hacían
        // la deuda, los ciclos adeudados de la pantalla y los recordatorios.
        dueDayIsCovered: data?.due_day_is_covered === true,
      };
    },
  });

export const useSetBillingSettings = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Se manda solo lo que se toca: el RPC lo resuelve con COALESCE. Eso además
    // hace que esta llamada funcione contra las dos versiones de la función
    // durante el despliegue — la que todavía recibe los parámetros del prorrateo
    // y la que ya no.
    mutationFn: async ({ dueDayIsCovered }) => {
      const { error } = await supabase.rpc("set_billing_settings", {
        p_gym_id: gymId,
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
