// Configuración del gate de entrenamiento de UN gym (lado panel).
//
// Son dos niveles independientes:
//   gated       → solo los inscriptos a una actividad de entrenamiento entran
//   requirePaid → además, esa inscripción tiene que estar al día (+ gracia)
// El segundo solo tiene efecto con el primero prendido.
//
// La lectura sale de gyms; la escritura NO va por un update directo: la RLS de
// gyms solo deja escribir a la plataforma, así que el owner pasa por el RPC
// set_training_access, que valida rol y toca solo estas tres columnas.

// React / libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

export const useTrainingAccessSettings = (gymId) =>
  useQuery({
    queryKey: ["training_access_settings", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select(
          "training_access_gated, training_access_require_paid, training_access_grace_days"
        )
        .eq("id", gymId)
        .maybeSingle();
      if (error) throw error;
      return {
        gated: data?.training_access_gated === true,
        // Default true: es lo que hacía el gate cuando era un solo interruptor.
        requirePaid: data?.training_access_require_paid !== false,
        graceDays: data?.training_access_grace_days ?? 10,
      };
    },
  });

export const useSetTrainingAccess = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    // Lo que no se manda queda como está (el RPC lo resuelve con COALESCE), así
    // que cada control del panel puede tocar solo lo suyo.
    mutationFn: async ({ gated, graceDays, requirePaid }) => {
      const { error } = await supabase.rpc("set_training_access", {
        p_gym_id: gymId,
        p_gated: gated,
        p_grace_days: graceDays ?? null,
        p_require_paid: requirePaid ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["training_access_settings", gymId],
      });
      // El veredicto del socio depende de esto: si el admin lo prueba con su
      // propia sesión, que no le quede el valor viejo.
      queryClient.invalidateQueries({ queryKey: ["training_access"] });
    },
  });
};
