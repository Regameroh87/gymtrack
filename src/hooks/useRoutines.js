// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { desc, count, eq } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { routines, routine_exercises } from "../database/schemas";

export const useRoutines = () =>
  useQuery({
    queryKey: ["routines"],
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
          status: routines.status,
          created_at: routines.created_at,
          exercise_count: count(routine_exercises.id),
        })
        .from(routines)
        .leftJoin(
          routine_exercises,
          eq(routines.id, routine_exercises.routine_id)
        )
        .groupBy(routines.id)
        .orderBy(desc(routines.created_at)),
  });
