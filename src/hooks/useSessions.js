// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { desc, count, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { sessions, session_exercises } from "../database/schemas";

export const useSessions = () =>
  useQuery({
    queryKey: ["sessions"],
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
        .where(ne(sessions.sync_status, "deleted"))
        .groupBy(sessions.id)
        .orderBy(desc(sessions.created_at)),
  });
