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
/* Lectura y Escritura simultáneas: Sin WAL, si alguien está escribiendo en la base de datos, nadie puede leer. Con WAL, los lectores no bloquean a los escritores y los escritores no bloquean a los lectores. Esto es crucial para que la app no se sienta trabada mientras guardas datos.
Mucho más rápido: Las operaciones de escritura son significativamente más rápidas porque escribir en el log de WAL es más eficiente que el método tradicional.
Mejor persistencia: Es más resistente a fallos de energía o cierres inesperados de la app. */
sqlite.execSync("PRAGMA journal_mode = WAL;");

export const database = drizzle(sqlite, { schema });

export function useInitDatabase() {
  return useMigrations(database, migrations);
}
