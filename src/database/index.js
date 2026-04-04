import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, deleteDatabaseSync } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as schema from "./schemas";
import migrations from "./migrations/migrations";

// 🔥 BORRAMOS LA DB ENTERA PARA LIMPIAR EL CACHÉ DE ANDROID 🔥
// (Cuando se resuelva tu error, puedes borrar o comentar esta línea)
try {
  deleteDatabaseSync("gymtrack.db");
  console.log("✅ BASE DE DATOS LOCAL REINICIADA FORZOSAMENTE");
} catch (_e) {
  console.log("No había base previa para borrar");
}

const sqlite = openDatabaseSync("gymtrack.db");

export const database = drizzle(sqlite, { schema });

export function useInitDatabase() {
  return useMigrations(database, migrations);
}
