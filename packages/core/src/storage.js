// Storage adapter inyectable (agnóstico de plataforma).
//
// Core no sabe en qué corre: el host inyecta una implementación al boot vía
// setStorageAdapter() y los consumers (hooks de drafts, theme, etc.) usan el
// singleton `storage`. La interfaz copia la de AsyncStorage —get/set/remove +
// getAllKeys/multiGet/multiSet, todo async— para que el móvil pueda inyectar
// AsyncStorage tal cual (la implementa nativamente) y la web inyecte un adapter
// de localStorage (envuelto en Promesas). Migrar un archivo a core es así un
// swap de import sin cambio de comportamiento.

let adapter = null;

export function setStorageAdapter(impl) {
  adapter = impl;
}

function need() {
  if (!adapter) {
    throw new Error(
      "[core/storage] No hay storage adapter configurado. Llamá setStorageAdapter(...) en el arranque del host (móvil: AsyncStorage; web: localStorage)."
    );
  }
  return adapter;
}

export const storage = {
  getItem: (key) => need().getItem(key),
  setItem: (key, value) => need().setItem(key, value),
  removeItem: (key) => need().removeItem(key),
  getAllKeys: () => need().getAllKeys(),
  multiGet: (keys) => need().multiGet(keys),
  multiSet: (pairs) => need().multiSet(pairs),
};
