// Subida de agregados diarios a Supabase (health_metrics). Deliberadamente
// FUERA del pipeline SQLite de sync: purgeSyncedTables() borra sus tablas al
// switchear gym/cuenta y este dato es per-user y gym-agnóstico. El health
// store del device es la fuente autoritativa, así que alcanza con un upsert
// idempotente sobre (user_id, date) — sin cola ni tombstones.
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { supabase } from "../../database/supabase";
import {
  SOURCE,
  isAvailable,
  getDailyActivity,
  getDailyHeartRate,
  getBodyWeight,
  toDateKey,
  daysAgo,
  HEALTH_CONNECTED_KEY,
  healthConsentKey,
  healthWatermarkKey,
} from "./index";

const BACKFILL_DAYS = 30;

let uploading = false;

// Idempotente y best-effort: los guards deciden si corresponde subir y los
// errores solo se loguean (el próximo trigger reintenta desde el watermark).
export const uploadHealthMetrics = async ({ authUserId }) => {
  if (!authUserId || uploading) return;
  uploading = true;
  try {
    const [connected, consent] = await Promise.all([
      AsyncStorage.getItem(HEALTH_CONNECTED_KEY),
      AsyncStorage.getItem(healthConsentKey(authUserId)),
    ]);
    if (connected !== "1" || consent !== "1") return;
    if (!(await isAvailable())) return;
    const { isConnected } = await NetInfo.fetch();
    if (!isConnected) return;

    // Se relee desde watermark−1d: los totales del día del último upload
    // pueden haber seguido creciendo después de subirlo.
    const watermark = await AsyncStorage.getItem(
      healthWatermarkKey(authUserId)
    );
    const startDate = watermark
      ? daysAgo(1, new Date(`${watermark}T12:00:00`))
      : daysAgo(BACKFILL_DAYS);
    const endDate = new Date();

    const [activity, heartRate, weight] = await Promise.all([
      getDailyActivity({ startDate, endDate }),
      getDailyHeartRate({ startDate, endDate }),
      getBodyWeight({ startDate, endDate }),
    ]);

    // PostgREST exige keys uniformes en el bulk upsert, así que cada fila
    // arranca con el set completo de métricas en null. null = "el health
    // store no tiene dato para ese día" (el store es autoritativo, pisar
    // con null en un re-upload es correcto).
    const byDate = new Map();
    const row = (date) => {
      if (!byDate.has(date)) {
        byDate.set(date, {
          user_id: authUserId,
          date,
          source: SOURCE,
          steps: null,
          active_calories: null,
          distance_meters: null,
          avg_heart_rate: null,
          min_heart_rate: null,
          max_heart_rate: null,
          resting_heart_rate: null,
          weight_kg: null,
        });
      }
      return byDate.get(date);
    };
    for (const day of activity) {
      Object.assign(row(day.date), {
        steps: day.steps,
        active_calories: day.activeCalories,
        distance_meters: day.distanceMeters,
      });
    }
    for (const day of heartRate) {
      Object.assign(row(day.date), {
        avg_heart_rate: day.avgBpm,
        min_heart_rate: day.minBpm,
        max_heart_rate: day.maxBpm,
        resting_heart_rate: day.restingBpm,
      });
    }
    for (const day of weight) {
      row(day.date).weight_kg = day.weightKg;
    }

    const rows = [...byDate.values()];
    if (rows.length === 0) return;

    const { error } = await supabase
      .from("health_metrics")
      .upsert(rows, { onConflict: "user_id,date" });
    if (error) throw error;

    await AsyncStorage.setItem(
      healthWatermarkKey(authUserId),
      toDateKey(endDate)
    );
  } catch (e) {
    console.warn("[HEALTH] upload falló:", e?.message ?? e);
  } finally {
    uploading = false;
  }
};

// Revocación de consentimiento: borra TODO lo subido (requisito de las
// políticas de salud de Apple/Google) y resetea el watermark para que un
// futuro opt-in re-backfillee.
export const deleteUploadedHealthMetrics = async ({ authUserId }) => {
  const { error } = await supabase
    .from("health_metrics")
    .delete()
    .eq("user_id", authUserId);
  if (error) throw error;
  await AsyncStorage.removeItem(healthWatermarkKey(authUserId));
};
