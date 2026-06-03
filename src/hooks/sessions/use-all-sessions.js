import { useSessions } from "./use-sessions";
import { useCustomSessions } from "./use-custom-sessions";

export const useAllSessions = () => {
  const { data: gymSessions = [], isLoading: gymLoading } = useSessions();
  const { data: customSessions = [], isLoading: customLoading } = useCustomSessions();

  return {
    data: [
      ...gymSessions.map((s) => ({ ...s, source: "gym" })),
      ...customSessions.map((s) => ({ ...s, source: "custom" })),
    ],
    isLoading: gymLoading || customLoading,
  };
};
