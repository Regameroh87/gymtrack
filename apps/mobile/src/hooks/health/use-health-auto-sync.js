import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { uploadHealthMetrics } from "../../lib/health/upload";
import { useAuth } from "../../auth/lib/getSession";

// Dispara la subida de métricas de salud al abrir la app y cada vez que
// vuelve a foreground. uploadHealthMetrics ya se auto-gatea (consentimiento,
// conexión al health store, red) y es idempotente, así que acá no hay guards.
// Se monta una sola vez en el layout protegido.
export const useHealthAutoSync = () => {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!authUserId) return;

    uploadHealthMetrics({ authUserId });

    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        uploadHealthMetrics({ authUserId });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [authUserId]);
};
