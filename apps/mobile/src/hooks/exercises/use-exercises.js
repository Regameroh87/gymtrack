// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { exercises_base } from "../../database/schemas";

// Ejercicios del gym activo. Excluye el contenido de catálogo (is_catalog), que se
// sincroniza siempre pero se sirve aparte vía useCatalogExercises (gateado por el
// flag default_catalog del gym). Ver [[project_default_catalog]].
export const useExercises = () =>
  useQuery({
    queryKey: ["exercises"],
    queryFn: () =>
      database
        .select()
        .from(exercises_base)
        .where(
          and(
            ne(exercises_base.sync_status, "deleted"),
            eq(exercises_base.is_catalog, false)
          )
        ),
  });
