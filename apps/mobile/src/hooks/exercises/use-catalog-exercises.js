// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { exercises_base } from "../../database/schemas";
import { useGym } from "@gymtrack/core/hooks/gyms/use-gym";
import { useActiveGym } from "../../contexts/active-gym-context";

// Ejercicios de CATÁLOGO (is_catalog=true, compartidos, read-only). Se sincronizan
// siempre, pero solo se sirven si el gym activo tiene el flag default_catalog. El gate
// es de UI: cuando el flag está off devolvemos vacío sin tocar la base local (las filas
// siguen ahí para resolver referencias de forks custom). Ver [[project_default_catalog]].
export const useCatalogExercises = () => {
  const { gymId } = useActiveGym();
  const { data: gym } = useGym(gymId);
  const enabled = !!gym?.default_catalog;

  return useQuery({
    queryKey: ["catalog_exercises", enabled],
    enabled,
    queryFn: () =>
      database
        .select()
        .from(exercises_base)
        .where(
          and(
            ne(exercises_base.sync_status, "deleted"),
            eq(exercises_base.is_catalog, true)
          )
        ),
  });
};
