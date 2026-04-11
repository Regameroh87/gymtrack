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
    // Instead of deleting, we mark them as deleted to sync the deletion to Supabase
    await database.update(exercise_equipment).set({ sync_status: "deleted" });
    await database.update(exercises_base).set({ sync_status: "deleted" });
    await database.update(equipment).set({ sync_status: "deleted" });

    const files = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory
    );
    console.log("Archivos:", files);

    // Borrar cada uno
    for (const file of files) {
      if (
        !file.endsWith(".db") &&
        !file.endsWith(".db-wal") &&
        !file.endsWith(".db-shm") &&
        !file.endsWith(".db-journal")
      ) {
        // excluís la base de datos
        await FileSystem.deleteAsync(FileSystem.documentDirectory + file);
      }
    }
    console.log("Limpieza completada");
    console.log("Database reset successful");

    const { success, error } = await checkNetInfoAndSync();
    console.warn(success, error);
    if (error) throw error;
    console.log("Sincronización completada");
    return { success: true };
  } catch (error) {
    console.error("Error resetting database:", error);
    return { success: false, error };
  }
}
