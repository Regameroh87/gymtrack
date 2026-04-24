import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import { exercises_base, equipment, exercise_equipment } from "./schemas";
import { supabase } from "../database/supabase";
import { eq, or, notInArray, and } from "drizzle-orm";
import { uploadFileToCloudinary } from "../utils/uploadFileToCloudinary";
import { deleteMediaLocally } from "../utils/saveMediaLocally";

const LAST_SYNC_KEY = "last_sync_at";

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
    console.error(`Error bajando cambios de ${tableName}:`, error);
    return false;
  }

  console.log("Descargando datos remotos");
  if (data && data.length > 0) {
    for (const remoteRow of data) {
      remoteRow.sync_status = "synced";
      await database.insert(schemaTable).values(remoteRow).onConflictDoUpdate({
        target: schemaTable.id,
        set: remoteRow,
      });
    }
    console.log(`Tabla ${tableName} actualizada desde la nube.`);
  }

  // Reconciliar borrados remotos: detectar registros locales "synced" que ya
  // no existen en Supabase (fueron borrados desde otro dispositivo)
  const { data: remoteIds, error: idsError } = await supabase
    .from(tableName)
    .select("id");

  if (!idsError && remoteIds) {
    const remoteIdList = remoteIds.map((r) => r.id);
    if (remoteIdList.length > 0) {
      await database
        .delete(schemaTable)
        .where(
          and(
            eq(schemaTable.sync_status, "synced"),
            notInArray(schemaTable.id, remoteIdList)
          )
        );
    } else {
      // Tabla vacía en Supabase: borrar todos los registros synced locales
      await database
        .delete(schemaTable)
        .where(eq(schemaTable.sync_status, "synced"));
    }
    console.log(`Reconciliación de borrados completada para ${tableName}.`);
  }

  return true;
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
  console.log("Cargando filas de equipamientos a sincronizar...", localChanges);
  if (localChanges.length === 0) return;

  for (let row of localChanges) {
    // Si está marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      console.log(
        "Borrando las filas de equipamientos a borrar de supabase..."
      );
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", row.id);

      if (!error) {
        await database.delete(equipment).where(eq(equipment.id, row.id));
        console.log("Equipamiento eliminado correctamente.");
      } else {
        console.error("Error al borrar equipamiento en Supabase:", error);
      }
      continue;
    }

    let updatedLocal = false;

    // 1. Subir Imagen a Cloudinary si es local
    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        console.log("Subiendo imagen de equipo a cloudinary...");
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          console.log("Imagen de equipo subida correctamente.");
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id;
          updatedLocal = true;
        }
      } catch (err) {
        console.error("Error subiendo imagen de equipo:", err);
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
      console.log("Equipamiento sincronizado correctamente.");
    } else {
      console.error("Error al subir equipo a Supabase:", error);
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
  console.log("filas a subir EXERCISES_BASE:", localChanges);

  for (let row of localChanges) {
    // Si está marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      console.log("Borrando ejercicio en remoto:", row.id);
      const { error } = await supabase
        .from("exercises_base")
        .delete()
        .eq("id", row.id);

      if (!error) {
        console.log("Borrando ejercicio en local", row.id);
        await database
          .delete(exercises_base)
          .where(eq(exercises_base.id, row.id));
      } else {
        console.error("Error al borrar ejercicio en remoto:", error);
        //Deberia guardar el error en un tabla de errores
      }
      continue;
    }

    // 1. Imagen
    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        console.log("Subiendo imagen ejercicio a remoto...");
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id; // Necesario para el push a Supabase después
          await database
            .update(exercises_base)
            .set({ image_uri: public_id })
            .where(eq(exercises_base.id, row.id));
        }
      } catch (err) {
        console.error("Error imagen ejercicio:", err);
      }
    }

    // 2. Video
    if (row.video_uri && row.video_uri.startsWith("file://")) {
      try {
        console.log("Subiendo video ejercicio a remoto...");
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.video_uri,
          uploadPreset: "gymtrack_videos",
          typeFile: "video",
        });
        if (public_id) {
          await deleteMediaLocally(row.video_uri);
          row.video_uri = public_id;
          await database
            .update(exercises_base)
            .set({ video_uri: public_id })
            .where(eq(exercises_base.id, row.id));
        }
      } catch (err) {
        console.error("Error video ejercicio:", err);
      }
    }

    // 3. Enviar a Supabase
    console.log("Subiendo ejercicio a remoto...", row.id);
    const { sync_status, ...restOfRow } = row;
    const { error } = await supabase
      .from("exercises_base")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(exercises_base)
        .set({ sync_status: "synced" })
        .where(eq(exercises_base.id, row.id));
    } else {
      // Marcamos como synced para no trabar la cola de sincronización,
      // aunque lo ideal es que el usuario lo corrija o lo borre.
      if (error.code === "23505") {
        console.warn(
          `Conflicto de unicidad para "${row.name}". Saltando push y marcando como sincronizado.`
        );
        await database
          .update(exercises_base)
          .set({ sync_status: "synced" })
          .where(eq(exercises_base.id, row.id));
      } else {
        console.error("Error al subir ejercicio a Supabase:", error);
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
  console.log("Filas de exercises_equipments a sincronizar:", localChanges);

  for (let row of localChanges) {
    //Si esta marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("exercise_equipment")
        .delete()
        .eq("id", row.id);

      if (!error) {
        console.log("Borrando database local de exercise_equipment");
        await database
          .delete(exercise_equipment)
          .where(eq(exercise_equipment.id, row.id));
      } else {
        console.error("Error al borrar fila en SQLite:", error);
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
    } else {
      console.error("Error al subir relación a Supabase:", error);
    }
  }
}

/**
 * Función Principal de Sincronización
 * Permite filtrar qué tablas sincronizar. Por defecto sincroniza todas.
 */
export async function syncWithSupabase(
  tablesToSync = ["exercises_base", "equipment", "exercise_equipment"]
) {
  try {
    const syncTime = new Date().toISOString();
    console.log(`Iniciando sincronización para: ${tablesToSync.join(", ")}...`);
    console.log("Hora de sincronizacion:", syncTime);

    // --- DOWNLOAD PHASE ---
    for (const table of tablesToSync) {
      const syncKey = `${LAST_SYNC_KEY}_${table}`;
      const lastSync = await AsyncStorage.getItem(syncKey);

      let schemaTable;
      if (table === "exercises_base") schemaTable = exercises_base;
      else if (table === "equipment") schemaTable = equipment;
      else if (table === "exercise_equipment") schemaTable = exercise_equipment;

      if (schemaTable) {
        const success = await pullTableChanges(table, schemaTable, lastSync);
        if (success) {
          // Guardamos el timestamp solo si el pull fue exitoso
          // Nota: El push se hace después, pero el timestamp de pull es el que manda para futuros deltas
          await AsyncStorage.setItem(syncKey, syncTime);
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

    console.log("Sincronización completada.");
    return { success: true };
  } catch (error) {
    console.error("Error fatal en sincronización:", error);
    return { success: false, error };
  }
}

/**
 * Listeners y Triggers
 */
export function startSyncListener() {
  let isFirstEvent = true;
  NetInfo.addEventListener((state) => {
    if (isFirstEvent) {
      isFirstEvent = false;
      return;
    }
    if (state.isConnected) {
      syncWithSupabase();
    }
  });
}

export async function checkNetInfoAndSync() {
  const netInfo = await NetInfo.fetch();
  if (netInfo.isConnected) {
    const { success, error } = await syncWithSupabase();
    return { success, error };
  }
}
