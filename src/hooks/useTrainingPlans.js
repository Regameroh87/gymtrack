// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { count, desc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { training_plan_days, training_plans } from "../database/schemas";

export const useTrainingPlans = ({ kind = "template" } = {}) =>
  useQuery({
    queryKey: ["training_plans", kind],
    queryFn: () =>
      database
        .select({
          id: training_plans.id,
          name: training_plans.name,
          description: training_plans.description,
          objective: training_plans.objective,
          level: training_plans.level,
          cover_image_uri: training_plans.cover_image_uri,
          kind: training_plans.kind,
          status: training_plans.status,
          created_at: training_plans.created_at,
          day_count: count(training_plan_days.id),
        })
        .from(training_plans)
        .leftJoin(
          training_plan_days,
          eq(training_plans.id, training_plan_days.plan_id)
        )
        .where(
          kind
            ? eq(training_plans.kind, kind)
            : ne(training_plans.sync_status, "deleted")
        )
        .groupBy(training_plans.id)
        .orderBy(desc(training_plans.created_at)),
  });
