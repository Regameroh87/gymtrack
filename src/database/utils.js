import { database } from "./index";
import { exercises_base, equipment, exercise_equipment } from "./schemas";
import * as FileSystem from "expo-file-system/legacy";
import { checkNetInfoAndSync } from "./sync";

/**
 * Resets the database by deleting all rows from all tables.
 * Use ONLY for development purposes.
 */
export async function resetDatabase() {
  try {
    // Delete in order to respect potential foreign keys (though SQLite doesn't always enforce them unless pragma is on)
    await database.delete(exercise_equipment);
    await database.delete(exercises_base);
    await database.delete(equipment);

    const files = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory
    );
    console.log("Archivos:", files);

    // Borrar cada uno
    for (const file of files) {
      await FileSystem.deleteAsync(FileSystem.documentDirectory + file);
    }
    console.log("Limpieza completada");
    console.log("Database reset successful");

    const syncResult = await checkNetInfoAndSync();
    if (!syncResult.success) {
      console.error("Error syncing database:", syncResult.error);
    }
    console.log("Sincronización completada");
  } catch (error) {
    console.error("Error resetting database:", error);
    return { success: false, error };
  }
}
