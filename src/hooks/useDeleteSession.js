// Librerías externas
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, inArray, and, ne, sql } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import {
  sessions,
  session_exercises,
  plan_week_days,
  plan_week_day_exercises,
  plan_weeks,
} from "../database/schemas";
import { checkNetInfoAndSync } from "../database/sync";

// Cuenta cuántos planes distintos usan esta sesión (excluye los ya marcados deleted).
export const countPlansUsingSession = async (sessionId) => {
  const rows = await database
    .selectDistinct({ plan_id: plan_weeks.plan_id })
    .from(plan_week_days)
    .innerJoin(plan_weeks, eq(plan_week_days.week_id, plan_weeks.id))
    .where(
      and(
        eq(plan_week_days.session_id, sessionId),
        ne(plan_week_days.sync_status, "deleted")
      )
    );
  return rows.length;
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await database.transaction(async (tx) => {
        // IDs de session_exercises de esta sesión
        const sessionExerciseIds = (
          await tx
            .select({ id: session_exercises.id })
            .from(session_exercises)
            .where(eq(session_exercises.session_id, id))
        ).map((r) => r.id);

        // Cascade local: plan_week_day_exercises que referencian estos session_exercises
        if (sessionExerciseIds.length) {
          await tx
            .update(plan_week_day_exercises)
            .set({
              sync_status: "deleted",
              updated_at: new Date().toISOString(),
            })
            .where(
              inArray(
                plan_week_day_exercises.session_exercise_id,
                sessionExerciseIds
              )
            );
        }

        // plan_week_days.session_id -> NULL (replica SET NULL remoto)
        await tx
          .update(plan_week_days)
          .set({
            session_id: null,
            sync_status: sql`CASE WHEN ${plan_week_days.sync_status} = 'pending' THEN 'pending' ELSE 'dirty' END`,
            updated_at: new Date().toISOString(),
          })
          .where(eq(plan_week_days.session_id, id));

        // Soft delete: session_exercises y session
        await tx
          .update(session_exercises)
          .set({
            sync_status: "deleted",
            updated_at: new Date().toISOString(),
          })
          .where(eq(session_exercises.session_id, id));

        await tx
          .update(sessions)
          .set({
            sync_status: "deleted",
            updated_at: new Date().toISOString(),
          })
          .where(eq(sessions.id, id));
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["training_plans"] });
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      queryClient.removeQueries({ queryKey: ["session", id] });
      checkNetInfoAndSync();
    },
  });
};
