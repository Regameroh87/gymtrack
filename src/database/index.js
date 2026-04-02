import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schemas";

const sqlite = openDatabaseSync("gymtrack.db");

export const db = drizzle(sqlite, { schema });
