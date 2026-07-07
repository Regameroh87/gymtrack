// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Actividades del gym ACTIVO (online, sin sync local). Cada actividad es un
// producto con su precio mensual; es la capa base para las suscripciones.
// Multi-gym: la RLS devuelve las de todos los gyms del usuario, el filtro por
// gym activo es del cliente (igual que el resto de listados del panel).
export const useActivities = (gymId) => {
  return useQuery({
    queryKey: ["activities", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      // Embebe los pases (activity_plans) y los coaches asignados
      // (activity_coaches, N por actividad con su esquema de pago). PostgREST no
      // ordena el recurso embebido de forma fiable, así que los ordenamos por
      // sort_order en cliente.
      const { data, error } = await supabase
        .from("activities")
        .select(
          "*, activity_plans(*), activity_coaches(id, coach_id, monthly_fee, revenue_share_pct, rate_per_class, is_active, coach:profiles!activity_coaches_coach_id_fkey(id, name, last_name))"
        )
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a) => ({
        ...a,
        activity_plans: [...(a.activity_plans ?? [])].sort(
          (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0)
        ),
      }));
    },
  });
};

// Pases de UNA actividad (para el editor de pases). Query propia y aislada para
// que el CRUD de pases refresque sin depender del embed del listado.
export const useActivityPlans = (activityId) => {
  return useQuery({
    queryKey: ["activity_plans", activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_plans")
        .select("*")
        .eq("activity_id", activityId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};
