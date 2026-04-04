import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import { exercises_base } from "./schemas";
import { supabase } from "../database/supabase";
import { eq, or } from "drizzle-orm";

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
    // Iteramos e insertamos o actualizamos cada registro.
    // Drizzle te permite hacer un "UPSERT" (Insertar si es nuevo, Actualizar si ya existe)

    // Para SQLite en Drizzle usamos onConflictDoUpdate u otra lógica para reemplazar
    for (const remoteRow of data) {
      // Nos aseguramos que en local se guarde con estado "synced" porque ya está perfecto con la nube
      remoteRow.sync_status = "synced";
      await database
        .insert(exercises_base)
        .values(remoteRow)
        .onConflictDoUpdate({
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
    const changesToUpload = localChanges.map((row) => {
      // Excluimos sync_status ya que es de uso exclusivamente local en SQLite
      const { sync_status, ...restOfRow } = row;
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
