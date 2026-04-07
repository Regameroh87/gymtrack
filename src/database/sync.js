import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import { exercises_base } from "./schemas";
import { supabase } from "../database/supabase";
import { eq, or } from "drizzle-orm";
import { uploadFileToCloudinary } from "../utils/uploadFileToCloudinary";
import { deleteMediaLocally } from "../utils/saveMediaLocally";

const LAST_SYNC_KEY = "last_sync_at";

export async function syncWithSupabase() {
  // 1. Leer última sincronización
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

  // 2. Bajar cambios de Supabase → Preparo la query
  let query = supabase.from("exercises_base").select("*");

  if (lastSync) {
    query = query.gt("updated_at", lastSync);
  }
  const { data } = await query;
  if (data && data.length > 0) {
    // Drizzle te permite hacer un "UPSERT" (Insertar si es nuevo, Actualizar si ya existe)
    for (const remoteRow of data) {
      // Nos aseguramos que en local se guarde con estado "synced" porque ya está perfecto con la nube
      remoteRow.sync_status = "synced";
      await database
        .insert(exercises_base)
        .values(remoteRow)
        .onConflictDoUpdate({
          // Para SQLite en Drizzle usamos onConflictDoUpdate u otra lógica para reemplazar
          target: exercises_base.id, // Si el ID ya existe en SQLite...
          set: remoteRow, // ...entonces pisa los datos con los nuevos
        });
    }
  }
  console.log("Ejercicios sincronizados correctamente...");

  // 3. Subir cambios locales → Supabase
  const localChanges = await database
    .select()
    .from(exercises_base)
    .where(
      or(
        eq(exercises_base.sync_status, "pending"),
        eq(exercises_base.sync_status, "dirty")
      )
    );
  if (localChanges.length > 0) {
    // ---- AQUÍ OCURRE LA MAGIA DEL UPLOAD BACKGROUND ----
    for (let row of localChanges) {
      let updatedLocal = false;

      // 1. Subir Imagen Local a Cloudinary
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
            row.local_image_uri = ""; // Limpiamos porque ya no está local
            updatedLocal = true;
          }
        } catch (err) {
          console.error("Error subiendo imagen en background:", err);
        }
      }

      // 2. Subir Video Local a Cloudinary
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
            row.local_video_uri = ""; // Limpiamos porque ya no está local
            updatedLocal = true;
          }
        } catch (err) {
          console.error("Error subiendo video en background:", err);
        }
      }

      // 3. Persistir en SQLite si logramos subir algo, por si se cae internet en este instante y no llega a Supabase
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
    }
    // ----------------------------------------------------

    const changesToUpload = localChanges.map((row) => {
      // Excluimos sync_status y las uris locales ya que son de uso EXCLUSIVAMENTE local en SQLite
      const { sync_status, local_image_uri, local_video_uri, ...restOfRow } =
        row;
      return restOfRow;
    });

    // Enviamos todo de una vez con Supabase Batch Insert/Update
    // Nota: Asegúrate de que tu tabla en Supabase se llame "exercises_base"
    const { error } = await supabase
      .from("exercises_base")
      .upsert(changesToUpload, { onConflict: "id" });

    if (!error) {
      // Si todo salió bien, marcamos los registros como sincronizados en SQLite
      await database
        .update(exercises_base)
        .set({ sync_status: "synced" })
        .where(
          or(
            eq(exercises_base.sync_status, "pending"),
            eq(exercises_base.sync_status, "dirty")
          )
        );
      console.log("Cambios locales subidos exitosamente a Supabase.");
    } else {
      console.error("Error al subir cambios a Supabase:", error);
    }
  }
  // 4. Actualizar timestamp
}

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
