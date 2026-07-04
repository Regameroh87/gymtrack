import { useEffect, useRef } from "react";
import { Alert, AppState, Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isAvailable,
  requestPermissions,
  verifyReadAccess,
  HEALTH_CONNECTED_KEY,
} from "../../lib/health";

// Estado de conexión con el health store del device (Apple Salud / Health
// Connect). "connected" combina nuestro flag en AsyncStorage con el permiso de
// lectura real del OS: en Android verificamos que el scope de Pasos siga
// concedido (el usuario puede revocarlo desde Health Connect); en iOS HealthKit
// no revela la lectura, así que verifyReadAccess devuelve true y confiamos en el
// flag, tratando las lecturas vacías como "sin datos".
export const useHealthConnection = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["health", "connection"],
    queryFn: async () => {
      const available = await isAvailable();
      const flagged =
        available && (await AsyncStorage.getItem(HEALTH_CONNECTED_KEY)) === "1";
      const connected = flagged && (await verifyReadAccess());
      return { available, connected };
    },
    staleTime: 30 * 1000,
  });

  // Revalidar al volver a foreground: si el usuario fue a Health Connect a
  // conceder (o revocar) el permiso de Pasos, la conexión se refleja al volver.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        queryClient.invalidateQueries({ queryKey: ["health", "connection"] });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { granted } = await requestPermissions();
      if (!granted) {
        // Solo Android llega acá (Health Connect sí reporta el rechazo);
        // en iOS el sheet "concedido" no distingue lectura denegada.
        Alert.alert(
          "Permiso necesario",
          "Para ver tu actividad, activá los permisos de salud de GymTrack.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Ir a Ajustes", onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, "1");
      return true;
    },
    onSuccess: (connected) => {
      if (connected) {
        queryClient.invalidateQueries({ queryKey: ["health"] });
      }
    },
  });

  return {
    available: query.data?.available ?? false,
    connected: query.data?.connected ?? false,
    isLoading: query.isLoading,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
  };
};
