// Librerías externas
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { sessions, session_exercises } from "../database/schemas";
import { checkNetInfoAndSync } from "../database/sync";

export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await database.transaction(async (tx) => {
        await tx
          .update(session_exercises)
          .set({ sync_status: "deleted" })
          .where(eq(session_exercises.session_id, id));
        await tx
          .update(sessions)
          .set({ sync_status: "deleted" })
          .where(eq(sessions.id, id));
      });
    },
    onSuccess: async (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.removeQueries({ queryKey: ["session", id] });
      await checkNetInfoAndSync();
    },
  });
};
