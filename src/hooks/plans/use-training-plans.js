// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, desc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { training_plans } from "../../database/schemas";
import { supabase } from "../../database/supabase";

const fetchCreators = async (ids) => {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, last_name, image_profile, role")
    .in("id", ids);

  if (error || !data) return new Map();

  return new Map(data.map((profile) => [profile.id, profile]));
};

export const useTrainingPlans = ({ publishedOnly = false } = {}) =>
  useQuery({
    queryKey: ["training_plans", publishedOnly],
    queryFn: async () => {
      const conds = [ne(training_plans.sync_status, "deleted")];
      if (publishedOnly) conds.push(eq(training_plans.is_published, true));

      const plans = await database
        .select({
          id: training_plans.id,
          name: training_plans.name,
          objective: training_plans.objective,
          level: training_plans.level,
          target_gender: training_plans.target_gender,
          weekly_days: training_plans.weekly_days,
          duration_weeks: training_plans.duration_weeks,
          cover_image_uri: training_plans.cover_image_uri,
          is_published: training_plans.is_published,
          created_by: training_plans.created_by,
          created_at: training_plans.created_at,
        })
        .from(training_plans)
        .where(and(...conds))
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
