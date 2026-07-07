// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Coaches asignados a UNA actividad, con su esquema de pago (fijo mensual, % de
// ingresos y/o tarifa por clase). Query propia y aislada (como useActivityPlans)
// para que el CRUD del manager refresque sin depender del embed del listado.
// El perfil del coach sí se puede embeber: activity_coaches.coach_id → profiles.id.
export const useActivityCoaches = (activityId) => {
  return useQuery({
    queryKey: ["activity_coaches", activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_coaches")
        .select(
          "*, coach:profiles!activity_coaches_coach_id_fkey(id, name, last_name, image_profile)"
        )
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};
