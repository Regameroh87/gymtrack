import { Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../../database/supabase";
import { healthConsentKey } from "../../lib/health";
import {
  uploadHealthMetrics,
  deleteUploadedHealthMetrics,
} from "../../lib/health/upload";
import { useAuth } from "../../auth/lib/getSession";

// Consentimiento para subir métricas de salud a Supabase (visible para el
// staff del gym). La fuente de verdad es profiles.health_sync_consent_at —
// la policy de insert de health_metrics lo exige server-side —; el mirror en
// AsyncStorage solo gatea el auto-sync offline.
export const useHealthConsent = () => {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["health", "consent", authUserId],
    enabled: !!authUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("health_sync_consent_at")
        .eq("user_id", authUserId)
        .single();
      if (error) throw error;
      const consented = !!data.health_sync_consent_at;
      // Re-sincroniza el mirror local por si se otorgó/revocó en otro device.
      await AsyncStorage.setItem(
        healthConsentKey(authUserId),
        consented ? "1" : "0",
      );
      return consented;
    },
  });

  const mutation = useMutation({
    mutationFn: async (consent) => {
      if (consent) {
        // Primero la columna (la policy de insert la exige), después el
        // mirror y la primera subida.
        const { error } = await supabase
          .from("profiles")
          .update({ health_sync_consent_at: new Date().toISOString() })
          .eq("user_id", authUserId);
        if (error) throw error;
        await AsyncStorage.setItem(healthConsentKey(authUserId), "1");
        await uploadHealthMetrics({ authUserId });
      } else {
        // Primero borrar lo subido (el delete no exige consentimiento),
        // después revocar la columna y el mirror.
        await deleteUploadedHealthMetrics({ authUserId });
        const { error } = await supabase
          .from("profiles")
          .update({ health_sync_consent_at: null })
          .eq("user_id", authUserId);
        if (error) throw error;
        await AsyncStorage.setItem(healthConsentKey(authUserId), "0");
      }
      return consent;
    },
    onSuccess: (consent) => {
      queryClient.setQueryData(["health", "consent", authUserId], consent);
    },
    onError: () => {
      Alert.alert(
        "No se pudo actualizar",
        "Hubo un problema al cambiar el permiso para compartir. Probá de nuevo con conexión.",
      );
    },
  });

  // El opt-in muestra el momento de consentimiento explícito que exigen las
  // políticas de salud de Apple/Google; el opt-out aplica directo.
  const setConsent = (consent) => {
    if (!consent) {
      mutation.mutate(false);
      return;
    }
    Alert.alert(
      "Compartir con tu gimnasio",
      "Tu entrenador y el staff de tus gimnasios van a poder ver tus métricas diarias (pasos, calorías, ritmo cardíaco y peso). Podés desactivarlo cuando quieras y se borra lo compartido.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Compartir", onPress: () => mutation.mutate(true) },
      ],
    );
  };

  return {
    consented: query.data ?? false,
    isLoading: query.isLoading,
    setConsent,
    isUpdating: mutation.isPending,
  };
};
