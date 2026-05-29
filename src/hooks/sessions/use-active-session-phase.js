// React
import { useCallback, useState } from "react";

// Librerías
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Debe matchear el formato de phaseKey en app/(protected)/sesion.jsx
const phaseKey = (dayId) => `gymtrack:session_phase:${dayId}`;

export function useActiveSessionPhase(dayId) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(!!dayId);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!dayId) {
        setIsActive(false);
        setIsLoading(false);
        return () => {
          cancelled = true;
        };
      }

      setIsLoading(true);
      AsyncStorage.getItem(phaseKey(dayId))
        .then((saved) => {
          if (cancelled) return;
          setIsActive(saved === "active");
        })
        .catch(() => {
          if (cancelled) return;
          setIsActive(false);
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [dayId])
  );

  return { isActive, dayId, isLoading };
}
