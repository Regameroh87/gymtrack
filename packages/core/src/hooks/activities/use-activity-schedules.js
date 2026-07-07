// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Horarios semanales recurrentes (activity_schedules). Online, sin sync local.
// El coach titular se embebe directo (schedules.coach_id → profiles.id).

const SELECT =
  "*, coach:profiles!activity_schedules_coach_id_fkey(id, name, last_name)";

// Horarios de UNA actividad (para el editor dentro de la actividad).
export const useActivitySchedules = (activityId) => {
  return useQuery({
    queryKey: ["activity_schedules", "activity", activityId],
    enabled: !!activityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_schedules")
        .select(SELECT)
        .eq("activity_id", activityId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

// Todos los horarios del gym (para la vista de agenda semanal global).
export const useGymSchedules = (gymId) => {
  return useQuery({
    queryKey: ["activity_schedules", "gym", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_schedules")
        .select(`${SELECT}, activities(name, color)`)
        .eq("gym_id", gymId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};
