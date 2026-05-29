// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { desc, ne } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { training_plans } from "../database/schemas";
import { supabase } from "../database/supabase";

const fetchCreators = async (ids) => {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, last_name, image_profile, role")
    .in("id", ids);

  if (error || !data) return new Map();

  return new Map(data.map((profile) => [profile.id, profile]));
};

export const useTrainingPlans = () =>
  useQuery({
    queryKey: ["training_plans"],
    queryFn: async () => {
      const plans = await database
        .select({
          id: training_plans.id,
          name: training_plans.name,
          objective: training_plans.objective,
          level: training_plans.level,
          weekly_days: training_plans.weekly_days,
          duration_weeks: training_plans.duration_weeks,
          cover_image_uri: training_plans.cover_image_uri,
          created_by: training_plans.created_by,
          created_at: training_plans.created_at,
        })
        .from(training_plans)
        .where(ne(training_plans.sync_status, "deleted"))
        .orderBy(desc(training_plans.created_at));

      const creatorIds = [
        ...new Set(plans.map((p) => p.created_by).filter(Boolean)),
      ];
      const creators = await fetchCreators(creatorIds);

      return plans.map((plan) => ({
        ...plan,
        creator: plan.created_by
          ? (creators.get(plan.created_by) ?? null)
          : null,
      }));
    },
  });
