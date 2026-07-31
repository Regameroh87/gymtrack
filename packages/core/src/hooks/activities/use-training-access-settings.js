// Configuración del gate de entrenamiento de UN gym (lado panel).
//
// La lectura sale de gyms; la escritura NO va por un update directo: la RLS de
// gyms solo deja escribir a la plataforma, así que el owner pasa por el RPC
// set_training_access, que valida rol y toca solo estas dos columnas.

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
        .select("training_access_gated, training_access_grace_days")
        .eq("id", gymId)
        .maybeSingle();
      if (error) throw error;
      return {
        gated: data?.training_access_gated === true,
        graceDays: data?.training_access_grace_days ?? 10,
      };
    },
  });

export const useSetTrainingAccess = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gated, graceDays }) => {
      const { error } = await supabase.rpc("set_training_access", {
        p_gym_id: gymId,
        p_gated: gated,
        p_grace_days: graceDays ?? null,
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
