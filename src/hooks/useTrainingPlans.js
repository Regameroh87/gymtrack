// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { count, desc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { training_plans } from "../database/schemas";

export const useTrainingPlans = () =>
  useQuery({
    queryKey: ["training_plans"],
    queryFn: () =>
      database
        .select({
          id: training_plans.id,
          name: training_plans.name,
          objective: training_plans.objective,
          created_at: training_plans.created_at,
          day_count: count(training_plan_days.id),
        })
        .from(training_plans)
        .leftJoin(
          training_plan_days,
          eq(training_plans.id, training_plan_days.plan_id)
        )
        .where(ne(training_plans.sync_status, "deleted"))
        .groupBy(training_plans.id)
        .orderBy(desc(training_plans.created_at)),
  });
