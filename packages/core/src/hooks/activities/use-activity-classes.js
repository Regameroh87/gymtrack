// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Clases materializadas del gym en un rango de fechas (agenda del período).
// Online, sin sync local. Actividad y coach efectivo embebidos directo.
export const useActivityClasses = (gymId, fromISO, toISO) => {
  return useQuery({
    queryKey: ["activity_classes", gymId, fromISO, toISO],
    enabled: !!gymId && !!fromISO && !!toISO,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_classes")
        .select(
          "*, activities(name, color), coach:profiles!activity_classes_coach_id_fkey(id, name, last_name)"
        )
        .eq("gym_id", gymId)
        .gte("date", fromISO)
        .lte("date", toISO)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};
