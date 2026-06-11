import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, and } from "drizzle-orm";
import * as Crypto from "expo-crypto";

import { database } from "../../database";
import { plan_assignments } from "../../database/schemas";
import { checkNetInfoAndSync } from "../../database/sync";
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

const todayDate = () => new Date().toISOString().split("T")[0];

export const useFollowCustomPlan = () => {
  const { userId } = useAuth();
  const { gymId } = useActiveGym();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customPlanId }) => {
      const today = todayDate();

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

      const newId = Crypto.randomUUID();
      await database.insert(plan_assignments).values({
        id: newId,
        plan_id: null,
        custom_plan_id: customPlanId,
        user_id: userId,
        assigned_by: userId,
        gym_id: gymId,
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
