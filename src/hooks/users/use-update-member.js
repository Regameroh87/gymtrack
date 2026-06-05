// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
