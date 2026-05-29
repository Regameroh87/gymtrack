import { useQuery } from "@tanstack/react-query";
import { desc, count, eq, ne } from "drizzle-orm";

import { database } from "../database";
import { custom_sessions, custom_session_exercises } from "../database/schemas";

export const useCustomSessions = () =>
  useQuery({
    queryKey: ["custom_sessions"],
    queryFn: () =>
      database
        .select({
          id: custom_sessions.id,
          name: custom_sessions.name,
          description: custom_sessions.description,
          level: custom_sessions.level,
          cover_image_uri: custom_sessions.cover_image_uri,
          created_at: custom_sessions.created_at,
          exercise_count: count(custom_session_exercises.id),
        })
        .from(custom_sessions)
        .leftJoin(
          custom_session_exercises,
          eq(custom_sessions.id, custom_session_exercises.session_id)
        )
        .where(ne(custom_sessions.sync_status, "deleted"))
        .groupBy(custom_sessions.id)
        .orderBy(desc(custom_sessions.created_at)),
  });
