// Librerías externas
import { eq } from "drizzle-orm";

// Base de datos
import { database } from "./index";

export async function deleteById(table, id) {
  await database
    .update(table)
    .set({ sync_status: "deleted" })
    .where(eq(table.id, id));
}
