// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

// DB
import { supabase } from "../../database/supabase";

// Eliminación permanente del gimnasio y todos sus datos (solo super_admin).
// Va por la edge function eliminar-gym (service role): limpia session_logs
// (FK NO ACTION), borra el gym en cascada y elimina las cuentas de usuarios
// que ya no pertenecen a ningún otro gym. El gym_id se pasa como variable al
// llamar mutate({ gymId }) para garantizar un valor fresco.
export const useDeleteGym = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ gymId }) => {
      const { error, data } = await supabase.functions.invoke("eliminar-gym", {
        body: { gym_id: gymId },
      });
      if (error) {
        let errorMsg = "Error al eliminar el gimnasio.";
        if (error.context) {
          try {
            const body = await error.context.json();
            if (body?.error) errorMsg = body.error;
          } catch {}
        }
        throw new Error(errorMsg);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_gyms_web"] });
      queryClient.invalidateQueries({ queryKey: ["gyms"] });
      router.replace("/platform/gyms");
    },
  });
};
