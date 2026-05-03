// Librerías externas
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { routines, routine_exercises } from "../database/schemas";
import { checkNetInfoAndSync } from "../database/sync";

export const useDeleteRoutine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await database.transaction(async (tx) => {
        await tx
          .update(routine_exercises)
          .set({ sync_status: "deleted" })
          .where(eq(routine_exercises.routine_id, id));
        await tx
          .update(routines)
          .set({ sync_status: "deleted" })
          .where(eq(routines.id, id));
      });
    },
    onSuccess: async (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.removeQueries({ queryKey: ["routine", id] });
      await checkNetInfoAndSync();
    },
  });
};
