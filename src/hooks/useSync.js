import { useEffect, useRef, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { syncWithSupabase } from "../database/sync";

/**
 * Hook que sincroniza automáticamente cuando hay conexión a internet.
 *
 * Uso:
 *   const { triggerSync } = useSync(["exercises_base"]);
 *   // Se sincroniza solo al detectar red
 *   // O podés llamar triggerSync() manualmente (ej: pull-to-refresh)
 *
 * @param {string[]} tables - Nombres de tablas a sincronizar
 */
export function useSync(tables = ["exercises_base"]) {
  const isSyncing = useRef(false);

  const triggerSync = useCallback(async () => {
    if (isSyncing.current) {
      console.log("⏳ Sync ya en progreso, ignorando...");
      return;
    }

    isSyncing.current = true;
    try {
      await syncWithSupabase({ tablesToSync: tables });
    } catch (error) {
      console.error("Error en sync:", error);
    } finally {
      isSyncing.current = false;
    }
  }, [tables]);

  useEffect(() => {
    // Escuchar cambios de conectividad
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        console.log("🌐 Conexión detectada, sincronizando...");
        triggerSync();
      }
    });

    return () => unsubscribe();
  }, [triggerSync]);

  return { triggerSync };
}
