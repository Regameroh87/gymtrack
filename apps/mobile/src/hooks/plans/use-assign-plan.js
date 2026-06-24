// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, and } from "drizzle-orm";
import * as Crypto from "expo-crypto";

// DB
import { database } from "../../database";
import { plan_assignments } from "../../database/schemas";
import { checkNetInfoAndSync } from "../../database/sync";

// Hooks
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

const todayDate = () => new Date().toISOString().split("T")[0];

// onSuccess compartido: refresca la query y dispara el sync offline-first
const usePlanAssignmentMutation = (mutationFn) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      checkNetInfoAndSync();
    },
  });
};

export const useAssignPlan = () => {
  const { userId } = useAuth();
  const { gymId } = useActiveGym();

  return usePlanAssignmentMutation(async ({ planId }) => {
    const today = todayDate();

    // Cerrar en un solo UPDATE cualquier asignación activa previa
    await database
      .update(plan_assignments)
      .set({
        status: "completed",
        end_date: today,
        updated_at: new Date().toISOString(),
        sync_status: "dirty",
      })
      .where(
        and(
          eq(plan_assignments.user_id, userId),
          eq(plan_assignments.status, "active")
        )
      );

    // Insertar nueva asignación (created_at/updated_at se autocompletan)
    const newId = Crypto.randomUUID();
    await database.insert(plan_assignments).values({
      id: newId,
      plan_id: planId,
      user_id: userId,
      assigned_by: userId,
      gym_id: gymId,
      start_date: today,
      status: "active",
      sync_status: "pending",
    });

    return newId;
  });
};

export const useDropPlan = () => {
  const { userId } = useAuth();

  return usePlanAssignmentMutation(async ({ assignmentId }) => {
    await database
      .update(plan_assignments)
      .set({
        status: "dropped",
        end_date: todayDate(),
        updated_at: new Date().toISOString(),
        sync_status: "dirty",
      })
      .where(
        and(
          eq(plan_assignments.id, assignmentId),
          eq(plan_assignments.user_id, userId)
        )
      );
  });
};
