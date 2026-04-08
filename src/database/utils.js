import { database } from "./index";
import { exercises_base, equipment, exercise_equipment } from "./schemas";

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

    console.log("Database reset successful");
    return { success: true };
  } catch (error) {
    console.error("Error resetting database:", error);
    return { success: false, error };
  }
}
