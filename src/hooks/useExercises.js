// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { ne } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { exercises_base } from "../database/schemas";

export const useExercises = () =>
  useQuery({
    queryKey: ["exercises"],
    queryFn: () =>
      database
        .select()
        .from(exercises_base)
        .where(ne(exercises_base.sync_status, "deleted")),
  });
