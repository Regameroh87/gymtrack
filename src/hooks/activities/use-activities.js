// React / libs
import { useQuery } from "@tanstack/react-query";

// DB / contexto
import { supabase } from "../../database/supabase";
import { useActiveGym } from "../../contexts/active-gym-context";

// Actividades del gym ACTIVO (online, sin sync local). Cada actividad es un
// producto con su precio mensual; es la capa base para las suscripciones.
// Multi-gym: la RLS devuelve las de todos los gyms del usuario, el filtro por
// gym activo es del cliente (igual que el resto de listados del panel).
export const useActivities = () => {
  const { gymId } = useActiveGym();

  return useQuery({
    queryKey: ["activities", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};
