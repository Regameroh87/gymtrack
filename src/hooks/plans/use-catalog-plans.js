// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, desc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { training_plans } from "../../database/schemas";
import { useGym } from "../gyms/use-gym";

// Planes de CATÁLOGO (is_catalog=true, read-only). Mismo shape que useTrainingPlans;
// gateados por el flag default_catalog del gym. Editar = forkear a custom (flujo
// existente, use-custom-training-plan-form). Ver [[project_default_catalog]].
export const useCatalogPlans = () => {
  const { data: gym } = useGym();
  const enabled = !!gym?.default_catalog;

  return useQuery({
    queryKey: ["catalog_plans", enabled],
    enabled,
    queryFn: () =>
      database
        .select({
          id: training_plans.id,
          name: training_plans.name,
          objective: training_plans.objective,
          level: training_plans.level,
          target_gender: training_plans.target_gender,
          weekly_days: training_plans.weekly_days,
          duration_weeks: training_plans.duration_weeks,
          cover_image_uri: training_plans.cover_image_uri,
          created_at: training_plans.created_at,
        })
        .from(training_plans)
        .where(
          and(
            ne(training_plans.sync_status, "deleted"),
            eq(training_plans.is_catalog, true)
          )
        )
        .orderBy(desc(training_plans.created_at)),
  });
};
