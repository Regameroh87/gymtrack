// Client de Apple HealthKit (@kingstinct/react-native-healthkit).
// Única capa que importa la lib nativa en iOS; el resto de la app consume
// la API normalizada de ./index (unidades: count, kcal, m, bpm, kg).
import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  queryStatisticsCollectionForQuantity,
  queryQuantitySamples,
  saveWorkoutSample,
  WorkoutActivityType,
} from "@kingstinct/react-native-healthkit";

import { toDateKey, startOfLocalDay, endOfLocalDay } from "./dates";

export const SOURCE = "healthkit";

const READ_TYPES = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierBodyMass",
];

const WRITE_TYPES = ["HKWorkoutTypeIdentifier"];

export const isAvailable = () => isHealthDataAvailableAsync();

// OJO: HealthKit nunca revela si el usuario concedió permisos de LECTURA
// (devuelve true si el sheet se mostró). El caller persiste su propio flag
// "connected" y trata las lecturas vacías como "sin datos".
export const requestPermissions = async () => {
  const granted = await requestAuthorization({
    toShare: WRITE_TYPES,
    toRead: READ_TYPES,
  });
  return { granted };
};

const dailyStatistics = async (
  identifier,
  statistics,
  unit,
  startDate,
  endDate
) => {
  const anchor = startOfLocalDay(startDate);
  return queryStatisticsCollectionForQuantity(
    identifier,
    statistics,
    anchor,
    { day: 1 },
    {
      unit,
      filter: {
        date: {
          startDate: startOfLocalDay(startDate),
          endDate: endOfLocalDay(endDate),
        },
      },
    }
  );
};

export const getDailyActivity = async ({ startDate, endDate }) => {
  const [steps, calories, distance] = await Promise.all([
    dailyStatistics(
      "HKQuantityTypeIdentifierStepCount",
      ["cumulativeSum"],
      "count",
      startDate,
      endDate
    ),
    dailyStatistics(
      "HKQuantityTypeIdentifierActiveEnergyBurned",
      ["cumulativeSum"],
      "kcal",
      startDate,
      endDate
    ),
    dailyStatistics(
      "HKQuantityTypeIdentifierDistanceWalkingRunning",
      ["cumulativeSum"],
      "m",
      startDate,
      endDate
    ),
  ]);

  const byDate = new Map();
  const row = (date) => {
    const key = toDateKey(date);
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
  for (const s of steps) {
    if (s.startDate && s.sumQuantity)
      row(s.startDate).steps = Math.round(s.sumQuantity.quantity);
  }
  for (const c of calories) {
    if (c.startDate && c.sumQuantity)
      row(c.startDate).activeCalories = c.sumQuantity.quantity;
  }
  for (const d of distance) {
    if (d.startDate && d.sumQuantity)
      row(d.startDate).distanceMeters = d.sumQuantity.quantity;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const getDailyHeartRate = async ({ startDate, endDate }) => {
  const [hr, resting] = await Promise.all([
    dailyStatistics(
      "HKQuantityTypeIdentifierHeartRate",
      ["discreteAverage", "discreteMin", "discreteMax"],
      "count/min",
      startDate,
      endDate
    ),
    dailyStatistics(
      "HKQuantityTypeIdentifierRestingHeartRate",
      ["discreteAverage"],
      "count/min",
      startDate,
      endDate
    ),
  ]);

  const byDate = new Map();
  for (const s of hr) {
    if (!s.startDate) continue;
    byDate.set(toDateKey(s.startDate), {
      date: toDateKey(s.startDate),
      avgBpm: s.averageQuantity?.quantity ?? null,
      minBpm: s.minimumQuantity?.quantity ?? null,
      maxBpm: s.maximumQuantity?.quantity ?? null,
      restingBpm: null,
    });
  }
  for (const s of resting) {
    if (!s.startDate || !s.averageQuantity) continue;
    const key = toDateKey(s.startDate);
    const existing = byDate.get(key) ?? {
      date: key,
      avgBpm: null,
      minBpm: null,
      maxBpm: null,
      restingBpm: null,
    };
    existing.restingBpm = s.averageQuantity.quantity;
    byDate.set(key, existing);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const getHeartRateSamples = async ({ startDate, endDate }) => {
  const samples = await queryQuantitySamples(
    "HKQuantityTypeIdentifierHeartRate",
    {
      limit: -1,
      ascending: true,
      unit: "count/min",
      filter: {
        date: { startDate: new Date(startDate), endDate: new Date(endDate) },
      },
    }
  );
  return samples.map((s) => ({
    timestamp: new Date(s.startDate).toISOString(),
    bpm: s.quantity,
  }));
};

// Devuelve la última medición de peso de cada día del rango.
export const getBodyWeight = async ({ startDate, endDate }) => {
  const samples = await queryQuantitySamples(
    "HKQuantityTypeIdentifierBodyMass",
    {
      limit: -1,
      ascending: true,
      unit: "kg",
      filter: {
        date: {
          startDate: startOfLocalDay(startDate),
          endDate: endOfLocalDay(endDate),
        },
      },
    }
  );
  const byDate = new Map();
  for (const s of samples) {
    byDate.set(toDateKey(s.startDate), {
      date: toDateKey(s.startDate),
      weightKg: s.quantity,
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export const writeWorkout = async ({ start, end, calories }) => {
  const totals =
    typeof calories === "number" && calories > 0
      ? { energyBurned: calories }
      : undefined;
  await saveWorkoutSample(
    WorkoutActivityType.traditionalStrengthTraining,
    [],
    new Date(start),
    new Date(end),
    totals
  );
  return true;
};
