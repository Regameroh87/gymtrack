import { useMemo } from "react";

import { useSessions } from "./use-sessions";
import { useCustomSessions } from "./use-custom-sessions";

export const useAllSessions = () => {
  const { data: gymSessions = [], isLoading: gymLoading } = useSessions();
  const { data: customSessions = [], isLoading: customLoading } = useCustomSessions();

  // Memoizado: sin esto, cada render devolvía un array nuevo con objetos nuevos,
  // lo que hacía re-renderizar toda la lista del picker en cada interacción.
  const data = useMemo(
    () => [
      ...gymSessions.map((s) => ({ ...s, source: "gym" })),
      ...customSessions.map((s) => ({ ...s, source: "custom" })),
    ],
    [gymSessions, customSessions]
  );

  return {
    data,
    isLoading: gymLoading || customLoading,
  };
};
