import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as schema from "./schemas";
import migrations from "./migrations/migrations";

const sqlite = openDatabaseSync("gymtrack.db");

export const database = drizzle(sqlite, { schema });

export function useInitDatabase() {
  return useMigrations(database, migrations);
}
