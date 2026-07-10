// Client de Health Connect (react-native-health-connect).
// Única capa que importa la lib nativa en Android; el resto de la app consume
// la API normalizada de ./index (unidades: count, kcal, m, bpm, kg).
import {
  initialize,
  getSdkStatus,
  SdkAvailabilityStatus,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  readRecords,
  aggregateGroupByPeriod,
  insertRecords,
  ExerciseType,
} from "react-native-health-connect";

import { toDateKey, startOfLocalDay, endOfLocalDay } from "./dates";

export const SOURCE = "health_connect";

const PERMISSIONS = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "Distance" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "RestingHeartRate" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "write", recordType: "ExerciseSession" },
];

// Scope núcleo: sin lectura de Pasos no hay actividad que mostrar. Health
// Connect concede permisos de a uno, así que exigimos éste puntualmente en vez
// de dar por buena la conexión con cualquier permiso suelto.
const hasStepsRead = (permissions) =>
  permissions.some((p) => p.accessType === "read" && p.recordType === "Steps");

let initialized = false;
const ensureInitialized = async () => {
  if (!initialized) {
    initialized = await initialize();
  }
  return initialized;
};

export const isAvailable = async () => false;

export const requestPermissions = async () => {
  await ensureInitialized();
  const granted = await requestPermission(PERMISSIONS);
  return { granted: hasStepsRead(granted) };
};

// Chequea contra el OS que el permiso de lectura de Pasos sigue concedido.
// El caller usa esto para que "connected" refleje el estado real (el usuario
// puede revocarlo desde Health Connect después de conectar).
export const verifyReadAccess = async () => {
  await ensureInitialized();
  const granted = await getGrantedPermissions();
  return hasStepsRead(granted);
};

export const openSettings = () => openHealthConnectSettings();

const betweenFilter = (startDate, endDate) => ({
  operator: "between",
  startTime: startOfLocalDay(startDate).toISOString(),
  endTime: endOfLocalDay(endDate).toISOString(),
});

const aggregateDaily = async (recordType, startDate, endDate) => {
  await ensureInitialized();
  return aggregateGroupByPeriod({
    recordType,
    timeRangeFilter: betweenFilter(startDate, endDate),
    timeRangeSlicer: { period: "DAYS", length: 1 },
  });
};

// Agrega una métrica sin dejar que su fallo (p.ej. permiso de lectura no
// concedido → SecurityException) tumbe al resto de las métricas del día.
const aggregateDailySafe = async (recordType, startDate, endDate) => {
  try {
    return await aggregateDaily(recordType, startDate, endDate);
  } catch (e) {
    console.warn(`[HEALTH] aggregate ${recordType} falló:`, e?.message ?? e);
    return [];
  }
};

// Health Connect devuelve 0 (no null) en días sin datos dentro del rango;
// lo normalizamos a null para no subir ceros falsos a Supabase.
const orNull = (value) => (value ? value : null);

export const getDailyActivity = async ({ startDate, endDate }) => {
  const [steps, calories, distance] = await Promise.all([
    aggregateDailySafe("Steps", startDate, endDate),
    aggregateDailySafe("ActiveCaloriesBurned", startDate, endDate),
    aggregateDailySafe("Distance", startDate, endDate),
  ]);

  const byDate = new Map();
  const row = (startTime) => {
    const key = toDateKey(startTime);
    if (!byDate.has(key)) {
      byDate.set(key, {
        date: key,
        steps: null,
        activeCalories: null,
        distanceMeters: null,
      });
    }
    return byDate.get(key);
  };
  for (const bucket of steps) {
    row(bucket.startTime).steps = orNull(
      Math.round(bucket.result.COUNT_TOTAL ?? 0)
    );
  }
  for (const bucket of calories) {
    row(bucket.startTime).activeCalories = orNull(
      bucket.result.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0
    );
  }
  for (const bucket of distance) {
    row(bucket.startTime).distanceMeters = orNull(
      bucket.result.DISTANCE?.inMeters ?? 0
    );
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const getDailyHeartRate = async ({ startDate, endDate }) => {
  const [hr, resting] = await Promise.all([
    aggregateDailySafe("HeartRate", startDate, endDate),
    aggregateDailySafe("RestingHeartRate", startDate, endDate),
  ]);

  const byDate = new Map();
  for (const bucket of hr) {
    const key = toDateKey(bucket.startTime);
    if (!bucket.result.MEASUREMENTS_COUNT) continue;
    byDate.set(key, {
      date: key,
      avgBpm: orNull(bucket.result.BPM_AVG),
      minBpm: orNull(bucket.result.BPM_MIN),
      maxBpm: orNull(bucket.result.BPM_MAX),
      restingBpm: null,
    });
  }
  for (const bucket of resting) {
    if (!bucket.result.BPM_AVG) continue;
    const key = toDateKey(bucket.startTime);
    const existing = byDate.get(key) ?? {
      date: key,
      avgBpm: null,
      minBpm: null,
      maxBpm: null,
      restingBpm: null,
    };
    existing.restingBpm = bucket.result.BPM_AVG;
    byDate.set(key, existing);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const getHeartRateSamples = async ({ startDate, endDate }) => {
  await ensureInitialized();
  const { records } = await readRecords("HeartRate", {
    timeRangeFilter: betweenFilter(startDate, endDate),
  });
  return records
    .flatMap((record) => record.samples ?? [])
    .map((sample) => ({
      timestamp: new Date(sample.time).toISOString(),
      bpm: sample.beatsPerMinute,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

// Devuelve la última medición de peso de cada día del rango.
export const getBodyWeight = async ({ startDate, endDate }) => {
  await ensureInitialized();
  const { records } = await readRecords("Weight", {
    timeRangeFilter: betweenFilter(startDate, endDate),
    ascendingOrder: true,
  });
  const byDate = new Map();
  for (const record of records) {
    const key = toDateKey(record.time);
    byDate.set(key, {
      date: key,
      weightKg: record.weight?.inKilograms ?? null,
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const writeWorkout = async ({ start, end }) => {
  await ensureInitialized();
  await insertRecords([
    {
      recordType: "ExerciseSession",
      exerciseType: ExerciseType.STRENGTH_TRAINING,
      title: "Entrenamiento GymTrack",
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
    },
  ]);
  return true;
};
