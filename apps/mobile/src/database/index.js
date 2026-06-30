import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, deleteDatabaseSync } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useCallback, useEffect } from "react";
import { DevSettings, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as schema from "./schemas";
import migrations from "./migrations/migrations";

const DB_NAME = "gymtrack.db";
// Flag persistido: marca que ya intentamos recrear la base local. Sobrevive el
// reload, así si tras recrear la migración SIGUE fallando (bug real de schema)
// no entramos en loop de borrar+recargar; se limpia al migrar OK.
const RESET_FLAG = "db_reset_attempted";
// Techo para que las migraciones resuelvan (success o error). Si la base quedó
// lockeada por WAL de un proceso anterior sin cierre limpio (o un sync escribiendo
// durante la migración), useMigrations puede no resolver NUNCA y el gate del root
// layout quedaría en "Cargando..." para siempre. Pasado este techo, recreamos la
// base como en el path de error. Generoso para no pisar una migración inicial real.
const MIGRATION_TIMEOUT_MS = 10_000;

const sqlite = openDatabaseSync(
  DB_NAME,
  Platform.OS === "android" ? { enableChangeListener: true } : {}
);
// Activar WAL mode al abrir
/* Lectura y Escritura simultáneas: Sin WAL, si alguien está escribiendo en la base de datos, nadie puede leer. Con WAL, los lectores no bloquean a los escritores y los escritores no bloquean a los lectores. Esto es crucial para que la app no se sienta trabada mientras guardas datos.
Mucho más rápido: Las operaciones de escritura son significativamente más rápidas porque escribir en el log de WAL es más eficiente que el método tradicional.
Mejor persistencia: Es más resistente a fallos de energía o cierres inesperados de la app. */
sqlite.execSync("PRAGMA journal_mode = WAL;");

export const database = drizzle(sqlite, { schema });

// Recarga el bundle para reabrir la base limpia tras recrearla. En dev usa el
// reload del dev menu; en prod, expo-updates.
function reloadApp() {
  if (__DEV__ && DevSettings?.reload) DevSettings.reload();
  else import("expo-updates").then((U) => U.reloadAsync()).catch(() => {});
}

export function useInitDatabase() {
  const state = useMigrations(database, migrations);
  const { success, error } = state;

  // Recrea la base local y recarga el bundle. La base local es un cache
  // offline-first; los datos reales viven en Supabase y se re-sincronizan, así que
  // recrear es seguro. Respeta RESET_FLAG: si ya recreamos una vez y el problema
  // persiste, no recreamos en loop (lo maneja el caller mostrando error o esperando).
  const recreateLocalDb = useCallback(async (reason) => {
    const already = await AsyncStorage.getItem(RESET_FLAG);
    if (already) return;
    await AsyncStorage.setItem(RESET_FLAG, "1");
    console.warn(`[DB] Recreando base local (${reason})`);
    try {
      sqlite.closeSync();
    } catch {}
    try {
      deleteDatabaseSync(DB_NAME);
    } catch (e) {
      console.error("[DB] No se pudo borrar la base local:", e);
    }
    reloadApp();
  }, []);

  // Si la migración falla porque la base local quedó desfasada del schema (p.ej.
  // tras squashear migraciones: las tablas ya existen y `CREATE TABLE` choca), la
  // recreamos.
  useEffect(() => {
    if (success) {
      // Migró OK → limpiar el flag para que un futuro desajuste pueda auto-sanar.
      AsyncStorage.removeItem(RESET_FLAG).catch(() => {});
      return;
    }
    if (!error) return;
    recreateLocalDb(`migración falló: ${error?.message}`);
  }, [success, error, recreateLocalDb]);

  // Red de seguridad contra un cuelgue permanente en el arranque: si useMigrations
  // no resuelve NI success NI error en MIGRATION_TIMEOUT_MS (base lockeada por WAL,
  // sync escribiendo durante la migración), el gate del root layout quedaría en
  // "Cargando..." sin escape. Tras el techo, recreamos la base como en el path de
  // error para nunca quedar pegados.
  useEffect(() => {
    if (success || error) return;
    const t = setTimeout(() => {
      recreateLocalDb("migración no resolvió (timeout)");
    }, MIGRATION_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [success, error, recreateLocalDb]);

  return state;
}
