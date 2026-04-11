import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as schema from "./schemas";
import migrations from "./migrations/migrations";
import { Platform } from "react-native";

const sqlite = openDatabaseSync(
  "gymtrack.db",
  Platform.OS === "android" ? { enableChangeListener: true } : {}
);
// Activar WAL mode al abrir
sqlite.execSync("PRAGMA journal_mode = WAL;");
console.log("DB abierta:", sqlite);

export const database = drizzle(sqlite, { schema });

export function useInitDatabase() {
  return useMigrations(database, migrations);
}
