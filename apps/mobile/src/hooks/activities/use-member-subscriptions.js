// React / libs
import { useQuery } from "@tanstack/react-query";

// DB / contexto
import { supabase } from "../../database/supabase";
import { useActiveGym } from "../../contexts/active-gym-context";

// Inscripciones a actividades de UN socio en el gym activo. El staff accede a las
// de sus socios por la rama is_staff_of de la RLS. Trae la actividad (nombre,
// color) y el pase (label, frecuencia) embebidos. Devuelve activas + historial.
export const useMemberSubscriptions = (memberId) => {
  const { gymId } = useActiveGym();

  return useQuery({
    queryKey: ["member_subscriptions", memberId, gymId],
    enabled: !!memberId && !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_subscriptions")
        .select(
          "*, activities(name, color), activity_plans(label, frequency_per_week)"
        )
        .eq("user_id", memberId)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      return {
        active: rows.filter((s) => s.status === "active"),
        past: rows.filter((s) => s.status !== "active"),
      };
    },
  });
};
