// React / libs
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

// DB / hooks
import { supabase } from "../../database/supabase";
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

const todayDate = () => new Date().toISOString().split("T")[0];

// Planes publicados del gym ACTIVO, asignables a un alumno. La RLS multi-gym
// devuelve los planes de todos los gyms del usuario, así que el filtro por
// gym_id es del cliente.
export const useAssignablePlans = () => {
  const { gymId } = useActiveGym();

  return useQuery({
    queryKey: ["assignable_plans", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select(
          "id, name, objective, level, target_gender, weekly_days, duration_weeks"
        )
        .eq("is_published", true)
        .or(`gym_id.eq.${gymId},is_catalog.eq.true`)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

// Asigna un plan a OTRO usuario (el alumno) escribiendo en Supabase directo.
// A diferencia de use-assign-plan (DB local, usuario propio), acá el staff opera
// sobre la fila del member; la RLS lo habilita por la rama is_staff_of. El
// gym_id es el gym activo del staff (no el del perfil del alumno, que con
// multi-gym puede apuntar a otro gimnasio).
export const useAssignPlanToMember = (memberId) => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  return useMutation({
    mutationFn: async ({ planId }) => {
      const today = todayDate();

      // Cerrar la asignación activa previa del alumno, si existe.
      const { error: closeErr } = await supabase
        .from("plan_assignments")
        .update({
          status: "completed",
          end_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", memberId)
        .eq("status", "active");
      if (closeErr) throw closeErr;

      // Insertar la nueva asignación activa.
      const id = Crypto.randomUUID();
      const { error: insErr } = await supabase.from("plan_assignments").insert({
        id,
        plan_id: planId,
        user_id: memberId,
        assigned_by: staffProfileId,
        gym_id: gymId,
        start_date: today,
        status: "active",
      });
      if (insErr) throw insErr;

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_detail", memberId] });
    },
  });
};
