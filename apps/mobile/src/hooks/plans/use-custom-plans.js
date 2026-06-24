import { useQuery } from "@tanstack/react-query";
import { desc, ne } from "drizzle-orm";

import { database } from "../../database";
import { custom_plans } from "../../database/schemas";

export const useCustomPlans = () =>
  useQuery({
    queryKey: ["custom_plans"],
    queryFn: () =>
      database
        .select({
          id: custom_plans.id,
          name: custom_plans.name,
          objective: custom_plans.objective,
          level: custom_plans.level,
          weekly_days: custom_plans.weekly_days,
          duration_weeks: custom_plans.duration_weeks,
          cover_image_uri: custom_plans.cover_image_uri,
          created_at: custom_plans.created_at,
        })
        .from(custom_plans)
        .where(ne(custom_plans.sync_status, "deleted"))
        .orderBy(desc(custom_plans.created_at)),
  });
