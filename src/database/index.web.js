// Stub web: expo-sqlite no se ejecuta en navegador.
// Mantiene los exports para que cualquier import transitivo no rompa el bundle.
// Cualquier intento real de usar la BD desde una pantalla web fallará en runtime
// (no se debería navegar a pantallas (protected) en web por ahora).

export const database = {};

export function useInitDatabase() {
  return { success: true, error: null };
}
