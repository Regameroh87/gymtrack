// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, and } from "drizzle-orm";
import * as Crypto from "expo-crypto";

// DB
import { database } from "../database";
import { plan_assignments } from "../database/schemas";
import { checkNetInfoAndSync } from "../database/sync";

// Hooks
import { useAuth } from "../auth/lib/getSession";

const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

export const useAssignPlan = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async ({ planId }) => {
      const today = new Date().toISOString().split("T")[0];

      // Marcar cualquier asignación activa previa como completada
      const existing = await database
        .select()
        .from(plan_assignments)
        .where(
          and(
            eq(plan_assignments.user_id, userId),
            eq(plan_assignments.status, "active")
          )
        );

      for (const prev of existing) {
        await database
          .update(plan_assignments)
          .set({
            status: "completed",
            end_date: today,
            updated_at: new Date().toISOString(),
            sync_status: "dirty",
          })
          .where(eq(plan_assignments.id, prev.id));
      }

      // Insertar nueva asignación
      const newId = Crypto.randomUUID();
      await database.insert(plan_assignments).values({
        id: newId,
        plan_id: planId,
        user_id: userId,
        assigned_by: userId,
        gym_id: GYM_ID,
        start_date: today,
        status: "active",
        sync_status: "pending",
      });

      return newId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      checkNetInfoAndSync();
    },
  });
};

export const useDropPlan = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async ({ assignmentId }) => {
      const today = new Date().toISOString().split("T")[0];
      await database
        .update(plan_assignments)
        .set({
          status: "dropped",
          end_date: today,
          updated_at: new Date().toISOString(),
          sync_status: "dirty",
        })
        .where(
          and(
            eq(plan_assignments.id, assignmentId),
            eq(plan_assignments.user_id, userId)
          )
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      checkNetInfoAndSync();
    },
  });
};
