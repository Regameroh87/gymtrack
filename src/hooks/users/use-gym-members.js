// React / libs
import { useQuery } from "@tanstack/react-query";

// DB / hooks
import { supabase } from "../../database/supabase";
import { useActiveGym } from "../../contexts/active-gym-context";

// Usuarios del gym ACTIVO con su rol POR GYM (memberships.role). Reemplaza al
// viejo listado directo de profiles: con multi-gym la pertenencia y el rol
// viven en memberships, y la RLS de profiles devuelve gente de TODOS los gyms
// del caller. PostgREST no puede joinear memberships→profiles (las FKs de
// ambas apuntan a auth.users), así que se resuelve en dos pasos.
export const useGymMembers = ({ onlyRole = null } = {}) => {
  const { gymId } = useActiveGym();

  return useQuery({
    queryKey: ["admin_users", gymId, onlyRole],
    enabled: !!gymId,
    queryFn: async () => {
      let membershipQuery = supabase
        .from("memberships")
        .select("user_id, role, status")
        .eq("gym_id", gymId)
        .eq("status", "active");
      if (onlyRole) membershipQuery = membershipQuery.eq("role", onlyRole);

      const { data: members, error } = await membershipQuery;
      if (error) throw error;
      if (!members?.length) return [];

      const roleByUser = Object.fromEntries(
        members.map((m) => [m.user_id, m.role])
      );

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in(
          "user_id",
          members.map((m) => m.user_id)
        )
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUser[p.user_id] ?? p.role,
      }));
    },
  });
};
