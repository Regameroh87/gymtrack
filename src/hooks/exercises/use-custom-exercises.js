import { useQuery } from "@tanstack/react-query";
import { ne } from "drizzle-orm";

import { database } from "../../database";
import { custom_exercises } from "../../database/schemas";

export const useCustomExercises = () =>
  useQuery({
    queryKey: ["custom_exercises"],
    queryFn: () =>
      database
        .select()
        .from(custom_exercises)
        .where(ne(custom_exercises.sync_status, "deleted")),
  });
