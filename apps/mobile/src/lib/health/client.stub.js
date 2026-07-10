// Stub de health: misma API que los clients nativos, todo "no disponible".
// Lo usan (a) el bundle web vía client.js y (b) index.js cuando la feature
// está apagada por flag (builds de producción sin permisos de salud).

export const SOURCE = null;

export const isAvailable = async () => false;

export const requestPermissions = async () => ({ granted: false });

export const verifyReadAccess = async () => false;

export const openSettings = () => {};

export const getDailyActivity = async () => [];

export const getHeartRateSamples = async () => [];

export const getDailyHeartRate = async () => [];

export const getBodyWeight = async () => [];

export const writeWorkout = async () => false;
