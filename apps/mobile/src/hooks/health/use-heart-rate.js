import { useQuery } from "@tanstack/react-query";

import { getDailyHeartRate, daysAgo } from "../../lib/health";
import { useAuth } from "../../auth/lib/getSession";
import { useHealthConnection } from "./use-health-connection";

// Frecuencia cardíaca agregada por día (avg/min/max + reposo) del health
// store del device.
export const useHeartRate = ({ days = 7 } = {}) => {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { connected } = useHealthConnection();

  return useQuery({
    queryKey: ["health", "heart-rate", authUserId, days],
    enabled: !!authUserId && connected,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      getDailyHeartRate({ startDate: daysAgo(days - 1), endDate: new Date() }),
  });
};
