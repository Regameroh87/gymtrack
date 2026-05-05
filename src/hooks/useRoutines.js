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
          id: routines.id,
          name: routines.name,
          description: routines.description,
          objective: routines.objective,
          level: routines.level,
          estimated_duration_min: routines.estimated_duration_min,
          cover_image_uri: routines.cover_image_uri,
          created_at: routines.created_at,
          exercise_count: count(routine_exercises.id),
        })
        .from(routines)
        .leftJoin(
          routine_exercises,
          eq(routines.id, routine_exercises.routine_id)
        )
        .where(ne(routines.sync_status, "deleted"))
        .groupBy(routines.id)
        .orderBy(desc(routines.created_at)),
  });
