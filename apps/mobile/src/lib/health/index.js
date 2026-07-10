// API pública de health. Todo el código de la app importa desde acá;
// Metro resuelve el client por plataforma (client.ios.js / client.android.js
// / stub client.js). Unidades normalizadas: count, kcal, m, bpm, kg.
import Constants from "expo-constants";

// Feature flag (extra.healthEnabled, calculado en app.config.js): los builds
// de producción salen SIN los módulos nativos de salud hasta que Google
// apruebe la declaración de Health Connect. El require es condicional a
// propósito: evaluar client.android.js sin el módulo nativo crashea, así que
// con el flag apagado se carga el stub y la feature queda "no disponible".
export const HEALTH_ENABLED =
  Constants.expoConfig?.extra?.healthEnabled === true;

const client = HEALTH_ENABLED ? require("./client") : require("./client.stub");

export { toDateKey, startOfLocalDay, endOfLocalDay, daysAgo } from "./dates";

// Keys de AsyncStorage. "connected" es global al device (los permisos del OS
// no son por cuenta); consent y watermark son por auth uid para que un cambio
// de cuenta en el mismo device no herede estado ajeno.
export const HEALTH_CONNECTED_KEY = "health:connected";
export const healthConsentKey = (authUserId) => `health:consent:${authUserId}`;
export const healthWatermarkKey = (authUserId) =>
  `health:last_upload_date:${authUserId}`;

export const SOURCE = client.SOURCE;
export const isAvailable = client.isAvailable;
export const requestPermissions = client.requestPermissions;
export const verifyReadAccess = client.verifyReadAccess;
export const openSettings = client.openSettings;
export const getDailyActivity = client.getDailyActivity;
export const getDailyHeartRate = client.getDailyHeartRate;
export const getHeartRateSamples = client.getHeartRateSamples;
export const getBodyWeight = client.getBodyWeight;

// Best-effort por contrato: se llama fire-and-forget al guardar una sesión
// y NUNCA debe romper ese flujo (sin permiso de escritura, health store
// ausente, etc. → false).
export const writeWorkout = async (options) => {
  try {
    // Sin duración real no hay workout que registrar (p.ej. log manual
    // cargado sin duración).
    if (!(new Date(options.end) > new Date(options.start))) return false;
    return await client.writeWorkout(options);
  } catch (e) {
    console.warn("[HEALTH] writeWorkout falló:", e?.message ?? e);
    return false;
  }
};
