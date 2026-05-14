// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { desc, ne } from "drizzle-orm";

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
          weekly_days: training_plans.weekly_days,
          duration_weeks: training_plans.duration_weeks,
          cover_image_uri: training_plans.cover_image_uri,
          created_at: training_plans.created_at,
        })
        .from(training_plans)
        .where(ne(training_plans.sync_status, "deleted"))
        .orderBy(desc(training_plans.created_at)),
  });
