// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, count, desc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { sessions, session_exercises } from "../../database/schemas";
import { useGym } from "../gyms/use-gym";

// Sesiones de CATÁLOGO (is_catalog=true, read-only). Mismo shape que useSessions para
// que el picker las renderice igual; gateadas por el flag default_catalog del gym.
// Editar = forkear a custom (flujo existente). Ver [[project_default_catalog]].
export const useCatalogSessions = () => {
  const { data: gym } = useGym();
  const enabled = !!gym?.default_catalog;

  return useQuery({
    queryKey: ["catalog_sessions", enabled],
    enabled,
    queryFn: () =>
      database
        .select({
          id: sessions.id,
          name: sessions.name,
          description: sessions.description,
          level: sessions.level,
          cover_image_uri: sessions.cover_image_uri,
          created_by: sessions.created_by,
          created_at: sessions.created_at,
          exercise_count: count(session_exercises.id),
        })
        .from(sessions)
        .leftJoin(
          session_exercises,
          eq(sessions.id, session_exercises.session_id)
        )
        .where(
          and(
            ne(sessions.sync_status, "deleted"),
            eq(sessions.is_catalog, true)
          )
        )
        .groupBy(sessions.id)
        .orderBy(desc(sessions.created_at)),
  });
};
