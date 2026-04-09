import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import { exercises_base, equipment } from "./schemas";
import { supabase } from "../database/supabase";
import { eq, or } from "drizzle-orm";
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
        eq(equipment.sync_status, "dirty")
      )
    );

  if (localChanges.length === 0) return;

  for (let row of localChanges) {
    let updatedLocal = false;

    // 1. Subir Imagen a Cloudinary si es local
    if (row.local_image_uri && row.local_image_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.local_image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          row.cloudinary_image_public_id = public_id;
          await deleteMediaLocally(row.local_image_uri);
          row.local_image_uri = "";
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
          cloudinary_image_public_id: row.cloudinary_image_public_id,
          local_image_uri: row.local_image_uri,
        })
        .where(eq(equipment.id, row.id));
    }

    // 2. Push a Supabase
    const { sync_status, local_image_uri, ...restOfRow } = row;
    const { error } = await supabase
      .from("equipment")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(equipment)
        .set({ sync_status: "synced" })
        .where(eq(equipment.id, row.id));
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
        eq(exercises_base.sync_status, "dirty")
      )
    );

  if (localChanges.length === 0) return;

  for (let row of localChanges) {
    let updatedLocal = false;

    // 1. Imagen
    if (row.local_image_uri && row.local_image_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.local_image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          row.cloudinary_image_public_id = public_id;
          await deleteMediaLocally(row.local_image_uri);
          row.local_image_uri = "";
          updatedLocal = true;
        }
      } catch (err) {
        console.error("Error imagen ejercicio:", err);
      }
    }

    // 2. Video
    if (row.local_video_uri && row.local_video_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.local_video_uri,
          uploadPreset: "gymtrack_videos",
          typeFile: "video",
        });
        if (public_id) {
          row.cloudinary_video_public_id = public_id;
          await deleteMediaLocally(row.local_video_uri);
          row.local_video_uri = "";
          updatedLocal = true;
        }
      } catch (err) {
        console.error("Error video ejercicio:", err);
      }
    }

    if (updatedLocal) {
      await database
        .update(exercises_base)
        .set({
          cloudinary_image_public_id: row.cloudinary_image_public_id,
          cloudinary_video_public_id: row.cloudinary_video_public_id,
          local_image_uri: row.local_image_uri,
          local_video_uri: row.local_video_uri,
        })
        .where(eq(exercises_base.id, row.id));
    }

    // 3. Enviar a Supabase
    const { sync_status, local_image_uri, local_video_uri, ...restOfRow } = row;
    const { error } = await supabase
      .from("exercises_base")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(exercises_base)
        .set({ sync_status: "synced" })
        .where(eq(exercises_base.id, row.id));
    } else {
      console.error("Error al subir ejercicio a Supabase:", error);
    }
  }
}

/**
 * Función Principal de Sincronización
 * Permite filtrar qué tablas sincronizar. Por defecto sincroniza todas.
 */
export async function syncWithSupabase(
  tablesToSync = ["exercises_base", "equipment"]
) {
  try {
    const syncTime = new Date().toISOString();
    console.log(`Iniciando sincronización para: ${tablesToSync.join(", ")}...`);

    // --- DOWNLOAD PHASE ---
    for (const table of tablesToSync) {
      const syncKey = `${LAST_SYNC_KEY}_${table}`;
      const lastSync = await AsyncStorage.getItem(syncKey);

      let schemaTable;
      if (table === "exercises_base") schemaTable = exercises_base;
      else if (table === "equipment") schemaTable = equipment;

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

    console.log("Sincronización completada.");
  } catch (error) {
    console.error("Error fatal en sincronización:", error);
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
    await syncWithSupabase();
  }
}
