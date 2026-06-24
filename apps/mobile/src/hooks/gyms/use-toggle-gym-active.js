// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../database/supabase";

// Suspende (is_active=false) o reactiva (true) un gimnasio entero. Es un soft
// flag reversible: no borra nada. La cascada de acceso la aplican las RLS
// (auth_gym_ids/is_staff_of/is_admin_of excluyen gyms suspendidos), así que al
// suspender, todos los miembros —incluido el dueño— pierden acceso. Solo el
// super_admin puede flipearlo: lo habilita la policy gyms_update.
export const useToggleGymActive = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isActive) => {
      const { error } = await supabase
        .from("gyms")
        .update({ is_active: isActive })
        .eq("id", gymId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_gyms_web"] });
      queryClient.invalidateQueries({ queryKey: ["gyms"] });
      queryClient.invalidateQueries({ queryKey: ["gym", gymId] });
    },
  });
};
