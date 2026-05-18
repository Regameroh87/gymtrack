// React / libs
import { useQuery } from "@tanstack/react-query";
import { eq, ne, desc, and, inArray } from "drizzle-orm";

// DB
import { database } from "../database";
import { plan_assignments, training_plans } from "../database/schemas";

// Hooks
import { useAuth } from "../auth/lib/getSession";

export const usePlanAssignments = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["plan_assignments"],
    enabled: !!userId,
    queryFn: async () => {
      const rows = await database
        .select({
          id: plan_assignments.id,
          plan_id: plan_assignments.plan_id,
          user_id: plan_assignments.user_id,
          assigned_by: plan_assignments.assigned_by,
          gym_id: plan_assignments.gym_id,
          start_date: plan_assignments.start_date,
          end_date: plan_assignments.end_date,
          status: plan_assignments.status,
          created_at: plan_assignments.created_at,
          plan_name: training_plans.name,
          plan_cover: training_plans.cover_image_uri,
          plan_objective: training_plans.objective,
          plan_level: training_plans.level,
          plan_weekly_days: training_plans.weekly_days,
          plan_duration_weeks: training_plans.duration_weeks,
        })
        .from(plan_assignments)
        .leftJoin(training_plans, eq(plan_assignments.plan_id, training_plans.id))
        .where(
          and(
            eq(plan_assignments.user_id, userId),
            ne(plan_assignments.sync_status, "deleted")
          )
        )
        .orderBy(desc(plan_assignments.created_at));

      const withPlan = rows.map((r) => ({
        ...r,
        plan: {
          name: r.plan_name,
          cover_image_uri: r.plan_cover,
          objective: r.plan_objective,
          level: r.plan_level,
          weekly_days: r.plan_weekly_days,
          duration_weeks: r.plan_duration_weeks,
        },
      }));

      return {
        currentPlan: withPlan.find((r) => r.status === "active") ?? null,
        history: withPlan.filter(
          (r) => r.status === "completed" || r.status === "dropped"
        ),
      };
    },
  });
};
