// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Actualiza los datos de un gimnasio (nombre, slug, contacto y tema). Solo el
// super_admin puede editar; RLS lo habilita por la policy gyms_update.
export const useUpdateGym = (gymId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields) => {
      const { error } = await supabase
        .from("gyms")
        .update(fields)
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
