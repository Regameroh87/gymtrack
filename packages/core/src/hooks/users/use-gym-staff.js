// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Staff del gym activo (owner/admin/coach): alimenta tanto el picker de coach de
// una actividad como la sección /admin/team. A diferencia de useGymMembers, NO
// excluye al usuario logueado (un dueño puede dictar y asignarse a sí mismo, y
// necesita verse en su propia lista de equipo). Devuelve el profile id (lo que
// referencia activities.coach_id) + datos de contacto y rol. Dos pasos porque
// memberships y profiles apuntan ambos a auth.users (PostgREST no puede
// joinear directo).
export const useGymStaff = (gymId) => {
  return useQuery({
    queryKey: ["gym_staff", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("memberships")
        .select("user_id, role")
        .eq("gym_id", gymId)
        .eq("status", "active")
        .in("role", ["owner", "admin", "coach"]);
      if (error) throw error;
      if (!members?.length) return [];

      const roleByUser = Object.fromEntries(
        members.map((m) => [m.user_id, m.role])
      );

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select(
          "id, user_id, name, last_name, email, phone, document_number, address, gender, is_active, image_profile, created_at"
        )
        .in(
          "user_id",
          members.map((m) => m.user_id)
        )
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUser[p.user_id] ?? null,
      }));
    },
  });
};
