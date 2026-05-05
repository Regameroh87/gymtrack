import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import {
  exercises_base,
  equipment,
  exercise_equipment,
  session_exercises,
  sessions,
} from "./schemas";
import { supabase } from "../database/supabase";
import { eq, or, inArray } from "drizzle-orm";
import { uploadFileToCloudinary } from "../utils/uploadFileToCloudinary";
import { deleteMediaLocally } from "../utils/saveMediaLocally";
import { queryClient } from "../lib/queryClient";

const LAST_SYNC_KEY = "last_sync_at";
let isSyncing = false;

const TABLE_QUERY_KEYS = {
  sessions: [["sessions"], ["session"]],
  session_exercises: [["sessions"], ["session"]],
  exercises_base: [["exercises"], ["exercise"]],
  equipment: [["equipments"], ["equipment"]],
  exercise_equipment: [
    ["exercises"],
    ["exercise"],
    ["exercise_equipment_detail"],
  ],
};

function invalidateQueriesForTable(tableName) {
  const keys = TABLE_QUERY_KEYS[tableName];
  if (!keys) return;
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * PULL: Descarga cambios de Supabase hacia SQLite de forma genérica
 */
async function pullTableChanges(tableName, schemaTable, lastSync) {
  let query = supabase.from(tableName).select("*");

  if (lastSync) {
    query = query.gt("updated_at", lastSync);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`❌ [PULL] Error descargando "${tableName}":`, error.message);
    return { success: false, changed: false };
  }

  let changed = false;

  if (data && data.length > 0) {
    for (const remoteRow of data) {
      remoteRow.sync_status = "synced";
      await database.insert(schemaTable).values(remoteRow).onConflictDoUpdate({
        target: schemaTable.id,
        set: remoteRow,
      });
    }
    changed = true;
    console.log(
      `⬇️  [PULL] "${tableName}": ${data.length} registro(s) descargado(s)`
    );
  }

  // Reconciliar borrados remotos: detectar registros locales "synced" que ya
  // no existen en Supabase (fueron borrados desde otro dispositivo)
  const { data: remoteIds, error: idsError } = await supabase
    .from(tableName)
    .select("id");

  if (!idsError && remoteIds) {
    const remoteIdSet = new Set(remoteIds.map((r) => r.id));
    const localSynced = await database
      .select({ id: schemaTable.id })
      .from(schemaTable)
      .where(eq(schemaTable.sync_status, "synced"));
    const idsToDelete = localSynced
      .map((r) => r.id)
      .filter((id) => !remoteIdSet.has(id));

    if (idsToDelete.length > 0) {
      await database
        .delete(schemaTable)
        .where(inArray(schemaTable.id, idsToDelete));
      changed = true;
      console.log(
        `🗑️  [PULL] "${tableName}": ${idsToDelete.length} eliminado(s) localmente`
      );
    }
  }

  return { success: true, changed };
}

/**
 * PUSH: Sube cambios locales de Máquinas/Equipamiento
 */
export async function pushEquipmentChanges() {
  const localChanges = await database
    .select()
    .from(equipment)
    .where(
      or(
        eq(equipment.sync_status, "pending"),
        eq(equipment.sync_status, "dirty"),
        eq(equipment.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] equipment: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    // Si está marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      console.log(
        `🗑️  [PUSH] Eliminando equipamiento "${row.name}" (id: ${row.id})`
      );
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", row.id);

      if (!error) {
        await database.delete(equipment).where(eq(equipment.id, row.id));
        console.log(`✅ [PUSH] Equipamiento "${row.name}" eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando equipamiento "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    let updatedLocal = false;

    // 1. Subir Imagen a Cloudinary si es local
    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        console.log(
          `⬆️  [PUSH] Subiendo imagen de "${row.name}" a Cloudinary...`
        );
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          console.log(
            `✅ [PUSH] Imagen de "${row.name}" subida (${public_id})`
          );
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id;
          updatedLocal = true;
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de "${row.name}":`,
          err.message
        );
      }
    }

    if (updatedLocal) {
      await database
        .update(equipment)
        .set({
          image_uri: row.image_uri,
        })
        .where(eq(equipment.id, row.id));
    }

    // 2. Push a Supabase
    const { sync_status, ...restOfRow } = row;
    const { error } = await supabase
      .from("equipment")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(equipment)
        .set({ sync_status: "synced" })
        .where(eq(equipment.id, row.id));
      console.log(`✅ [PUSH] Equipamiento "${row.name}" sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo equipamiento "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios (Media Pesada)
 */
export async function pushExercisesChanges() {
  const localChanges = await database
    .select()
    .from(exercises_base)
    .where(
      or(
        eq(exercises_base.sync_status, "pending"),
        eq(exercises_base.sync_status, "dirty"),
        eq(exercises_base.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] exercises_base: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    // Si está marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      console.log(
        `🗑️  [PUSH] Eliminando ejercicio "${row.name}" (id: ${row.id})`
      );
      const { error } = await supabase
        .from("exercises_base")
        .delete()
        .eq("id", row.id);

      if (!error) {
        console.log(`✅ [PUSH] Ejercicio "${row.name}" eliminado`);
        await database
          .delete(exercises_base)
          .where(eq(exercises_base.id, row.id));
      } else {
        console.error(
          `❌ [PUSH] Error eliminando ejercicio "${row.name}":`,
          error.message
        );
        //Deberia guardar el error en un tabla de errores
      }
      continue;
    }

    // 1. Imagen
    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        console.log(
          `⬆️  [PUSH] Subiendo imagen de "${row.name}" a Cloudinary...`
        );
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          console.log(
            `✅ [PUSH] Imagen de "${row.name}" subida (${public_id})`
          );
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id; // Necesario para el push a Supabase después
          await database
            .update(exercises_base)
            .set({ image_uri: public_id })
            .where(eq(exercises_base.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de "${row.name}":`,
          err.message
        );
      }
    }

    // 2. Video
    if (row.video_uri && row.video_uri.startsWith("file://")) {
      try {
        console.log(
          `⬆️  [PUSH] Subiendo video de "${row.name}" a Cloudinary...`
        );
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.video_uri,
          uploadPreset: "gymtrack_videos",
          typeFile: "video",
        });
        if (public_id) {
          console.log(`✅ [PUSH] Video de "${row.name}" subido (${public_id})`);
          await deleteMediaLocally(row.video_uri);
          row.video_uri = public_id;
          await database
            .update(exercises_base)
            .set({ video_uri: public_id })
            .where(eq(exercises_base.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo video de "${row.name}":`,
          err.message
        );
      }
    }

    // 3. Enviar a Supabase
    console.log(
      `⬆️  [PUSH] Subiendo ejercicio "${row.name}" (id: ${row.id})...`
    );
    const { sync_status, ...restOfRow } = row;
    const { error } = await supabase
      .from("exercises_base")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(exercises_base)
        .set({ sync_status: "synced" })
        .where(eq(exercises_base.id, row.id));
      console.log(`✅ [PUSH] Ejercicio "${row.name}" sincronizado`);
    } else {
      // Marcamos como synced para no trabar la cola de sincronización,
      // aunque lo ideal es que el usuario lo corrija o lo borre.
      if (error.code === "23505") {
        console.warn(
          `⚠️  [PUSH] Conflicto de nombre duplicado en "${row.name}" — se marca como sincronizado para no bloquear la cola`
        );
        await database
          .update(exercises_base)
          .set({ sync_status: "synced" })
          .where(eq(exercises_base.id, row.id));
      } else {
        console.error(
          `❌ [PUSH] Error subiendo ejercicio "${row.name}":`,
          error.message
        );
      }
    }
  }
}

/**
 * PUSH: Sube cambios locales de Relación Ejercicio-Equipo
 */
export async function pushExerciseEquipmentChanges() {
  const localChanges = await database
    .select()
    .from(exercise_equipment)
    .where(
      or(
        eq(exercise_equipment.sync_status, "pending"),
        eq(exercise_equipment.sync_status, "dirty"),
        eq(exercise_equipment.sync_status, "deleted")
      )
    );

  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] exercise_equipment: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    //Si esta marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("exercise_equipment")
        .delete()
        .eq("id", row.id);

      if (!error) {
        console.log(
          `✅ [PUSH] Relación exercise_equipment (id: ${row.id}) eliminada`
        );
        await database
          .delete(exercise_equipment)
          .where(eq(exercise_equipment.id, row.id));
      } else {
        console.error(
          `❌ [PUSH] Error eliminando relación exercise_equipment (id: ${row.id}) en Supabase:`,
          error.message
        );
      }
      continue;
    }

    const { sync_status, ...restOfRow } = row;
    const { error } = await supabase
      .from("exercise_equipment")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(exercise_equipment)
        .set({ sync_status: "synced" })
        .where(eq(exercise_equipment.id, row.id));
      console.log(
        `✅ [PUSH] Relación exercise_equipment (id: ${row.id}) sincronizada`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo relación exercise_equipment (id: ${row.id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Rutinas
 */
export async function pushSessionsChanges() {
  const localChanges = await database
    .select()
    .from(sessions)
    .where(
      or(
        eq(sessions.sync_status, "pending"),
        eq(sessions.sync_status, "dirty"),
        eq(sessions.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] sessions: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database.delete(sessions).where(eq(sessions.id, row.id));
        console.log(`✅ [PUSH] Sesión "${row.name}" eliminada`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando sesión "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    // Subir imagen de portada a Cloudinary si es local
    if (row.cover_image_uri && row.cover_image_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.cover_image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          await deleteMediaLocally(row.cover_image_uri);
          row.cover_image_uri = public_id;
          await database
            .update(sessions)
            .set({ cover_image_uri: public_id })
            .where(eq(sessions.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de rutina "${row.name}":`,
          err.message
        );
      }
    }

    const { sync_status, ...restOfRow } = row;
    const { error } = await supabase
      .from("sessions")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(sessions)
        .set({ sync_status: "synced" })
        .where(eq(sessions.id, row.id));
      console.log(`✅ [PUSH] Sesión "${row.name}" sincronizada`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo rutina "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios de Rutina
 */
export async function pushSessionExercisesChanges() {
  const localChanges = await database
    .select()
    .from(session_exercises)
    .where(
      or(
        eq(session_exercises.sync_status, "pending"),
        eq(session_exercises.sync_status, "dirty"),
        eq(session_exercises.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] session_exercises: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("session_exercises")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database
          .delete(session_exercises)
          .where(eq(session_exercises.id, row.id));
        console.log(`✅ [PUSH] session_exercise (id: ${row.id}) eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando routine_exercise (id: ${row.id}):`,
          error.message
        );
      }
      continue;
    }

    const { sync_status, ...restOfRow } = row;
    const { error } = await supabase
      .from("session_exercises")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(session_exercises)
        .set({ sync_status: "synced" })
        .where(eq(session_exercises.id, row.id));
      console.log(`✅ [PUSH] session_exercise (id: ${row.id}) sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo routine_exercise (id: ${row.id}):`,
        error.message
      );
    }
  }
}

export async function syncWithSupabase(
  tablesToSync = [
    "exercises_base",
    "equipment",
    "exercise_equipment",
    "sessions",
    "session_exercises",
  ]
) {
  if (isSyncing) {
    console.log(
      `⏳ [SYNC] Ya hay una sincronización en progreso, ignorando...`
    );
    return { success: false, skipped: true };
  }
  isSyncing = true;
  try {
    const syncTime = new Date().toISOString();
    console.log(
      `🔄 [SYNC] Iniciando — tablas: [${tablesToSync.join(", ")}] — ${syncTime}`
    );

    // --- DOWNLOAD PHASE ---
    for (const table of tablesToSync) {
      const syncKey = `${LAST_SYNC_KEY}_${table}`;
      const lastSync = await AsyncStorage.getItem(syncKey);

      let schemaTable;
      if (table === "exercises_base") schemaTable = exercises_base;
      else if (table === "equipment") schemaTable = equipment;
      else if (table === "exercise_equipment") schemaTable = exercise_equipment;
      else if (table === "sessions") schemaTable = sessions;
      else if (table === "session_exercises") schemaTable = session_exercises;

      if (schemaTable) {
        const { success, changed } = await pullTableChanges(
          table,
          schemaTable,
          lastSync
        );
        if (success) {
          // Guardamos el timestamp solo si el pull fue exitoso
          // Nota: El push se hace después, pero el timestamp de pull es el que manda para futuros deltas
          await AsyncStorage.setItem(syncKey, syncTime);
          if (changed) invalidateQueriesForTable(table);
        }
      }
    }

    // --- UPLOAD PHASE ---
    if (tablesToSync.includes("exercises_base")) {
      await pushExercisesChanges();
    }
    if (tablesToSync.includes("equipment")) {
      await pushEquipmentChanges();
    }
    if (tablesToSync.includes("exercise_equipment")) {
      await pushExerciseEquipmentChanges();
    }
    if (tablesToSync.includes("sessions")) {
      await pushSessionsChanges();
    }
    if (tablesToSync.includes("session_exercises")) {
      await pushSessionExercisesChanges();
    }
    console.log(`✅ [SYNC] Sincronización completada`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [SYNC] Error fatal:`, error.message);
    return { success: false, error };
  } finally {
    isSyncing = false;
  }
}

/**
 * Listeners y Triggers
 */
export function startSyncListener() {
  let previouslyConnected = null;
  NetInfo.addEventListener((state) => {
    const isConnected = !!(state.isConnected && state.isInternetReachable);
    if (previouslyConnected === false && isConnected) {
      syncWithSupabase();
    }
    previouslyConnected = isConnected;
  });
}

export async function checkNetInfoAndSync() {
  const netInfo = await NetInfo.fetch();
  if (netInfo.isConnected) {
    const { success, error } = await syncWithSupabase();
    return { success, error };
  }
}
