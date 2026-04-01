/**
 * Inicialización de WatermelonDB.
 *
 * Este archivo crea la instancia de la base de datos SQLite local.
 * Se exporta `database` para usar en toda la app.
 *
 * Para agregar una nueva tabla:
 *   1. Agregar tableSchema en schema.js
 *   2. Crear el Model en models/
 *   3. Registrar el Model acá en modelClasses
 */
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

import { schema } from "./schema";
import { migrations } from "./migrations";

// Models
import Exercise from "./models/Exercise";

// Adapter: conecta WatermelonDB con SQLite nativo
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // JSI = JavaScript Interface, acceso directo a C++ (más rápido)
  // Requiere dev build (npx expo run:android)
  jsi: true,
  onSetUpError: (error) => {
    console.error("❌ Error inicializando WatermelonDB:", error);
  },
});

// Instancia de la Database
export const database = new Database({
  adapter,
  modelClasses: [Exercise],
});
