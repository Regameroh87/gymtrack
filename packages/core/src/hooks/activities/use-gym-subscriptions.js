// React / libs
import { useQuery } from "@tanstack/react-query";

// DB / contexto
import { supabase } from "../../supabase.js";
import { useActiveGym } from "../../contexts/active-gym-context";

// Todas las inscripciones ACTIVAS del gym activo, para el panel de Contabilidad.
// La actividad (con su coach) y el pase se embeben; el socio no se puede embeber
// directo (memberships/profiles apuntan a auth.users), así que se resuelve en dos
// pasos como en use-gym-members. El staff accede por la rama is_staff_of de la RLS.
export const useGymSubscriptions = () => {
  const { gymId } = useActiveGym();

  return useQuery({
    queryKey: ["gym_subscriptions", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_subscriptions")
        .select(
          "*, activities(name, color, coach:profiles!activities_coach_id_fkey(name, last_name)), activity_plans(label, frequency_per_week)"
        )
        .eq("gym_id", gymId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      if (!rows.length) return [];

      // Adjuntar el socio (profiles.id = activity_subscriptions.user_id).
      const memberIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, last_name, image_profile")
        .in("id", memberIds);
      if (pErr) throw pErr;

      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, member: byId[r.user_id] ?? null }));
    },
  });
};
