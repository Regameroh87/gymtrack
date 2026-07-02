// Stub por defecto (web / plataformas sin health store). Metro resuelve
// client.ios.js / client.android.js en dispositivos; este archivo garantiza
// que el bundle no rompa y que la UI trate la feature como "no disponible".

export const SOURCE = null;

export const isAvailable = async () => false;

export const requestPermissions = async () => ({ granted: false });

export const getDailyActivity = async () => [];

export const getHeartRateSamples = async () => [];

export const getDailyHeartRate = async () => [];

export const getBodyWeight = async () => [];

export const writeWorkout = async () => false;
