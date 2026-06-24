import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

import { database } from "../../database";

export function useRecordById(queryKey, table, id, options = {}) {
  return useQuery({
    queryKey: [queryKey, id],
    enabled: !!id,
    queryFn: async () => {
      const [row] = await database.select().from(table).where(eq(table.id, id));
      return row ?? null;
    },
    ...options,
  });
}
