// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

// DB
import { supabase } from "../../database/supabase";

// Actualiza datos de perfil de un alumno (staff edita a sus alumnos; RLS lo
// habilita por is_staff_of en la policy de escritura de profiles).
export const useUpdateMember = (memberId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields) => {
      const { error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_detail", memberId] });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
};

// Eliminación permanente del socio del gym (solo owner/super_admin).
// Si el usuario no tiene otras membresías, elimina también la cuenta completa.
export const useDeleteMember = ({ gymId, targetUserId }) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const { error, data } = await supabase.functions.invoke("eliminar-socio", {
        body: { gym_id: gymId, target_user_id: targetUserId },
      });
      if (error) {
        const body = await error.context?.json?.();
        throw new Error(body?.error ?? "Error al eliminar el socio.");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      router.replace("/admin/users");
    },
  });
};

// Alta/baja del alumno (toggle is_active).
export const useToggleMemberActive = (memberId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isActive) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_detail", memberId] });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
};
