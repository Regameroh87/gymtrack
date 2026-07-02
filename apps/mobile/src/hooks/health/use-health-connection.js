import { Alert, Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isAvailable,
  requestPermissions,
  HEALTH_CONNECTED_KEY,
} from "../../lib/health";

// Estado de conexión con el health store del device (Apple Salud / Health
// Connect). "connected" es un flag propio en AsyncStorage: HealthKit nunca
// revela si el usuario concedió permisos de lectura, así que lo persistimos
// nosotros después de un connect exitoso y tratamos lecturas vacías como
// "sin datos".
export const useHealthConnection = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["health", "connection"],
    queryFn: async () => {
      const available = await isAvailable();
      const connected =
        available && (await AsyncStorage.getItem(HEALTH_CONNECTED_KEY)) === "1";
      return { available, connected };
    },
    staleTime: Infinity,
  });

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
