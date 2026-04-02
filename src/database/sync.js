import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import { exercisesBase } from "./schemas";
import { supabase } from "../database/supabase";
import { eq, or } from "drizzle-orm";

const LAST_SYNC_KEY = "last_sync_at";

export async function syncWithSupabase() {
  // 1. Leer última sincronización
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

  // 2. Bajar cambios de Supabase → SQLite
  let query = supabase.from("exercises_base").select("*");

  if (lastSync) {
    query = query.gt("updated_at", lastSync);
  }
  const { data } = await query;
  // 3. Subir cambios locales → Supabase
  const localChanges = await database
    .select()
    .from(exercisesBase)
    .where(
      or(
        eq(exercisesBase.sync_status, "pending"),
        eq(exercisesBase.sync_status, "dirty")
      )
    );
  // 4. Actualizar timestamp
}

export function startSyncListener() {
  NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncWithSupabase();
    }
  });
}
