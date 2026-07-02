import { useQuery } from "@tanstack/react-query";

import { getBodyWeight, daysAgo } from "../../lib/health";
import { useAuth } from "../../auth/lib/getSession";
import { useHealthConnection } from "./use-health-connection";

// Peso corporal (última medición de cada día) del health store del device.
export const useBodyWeight = ({ days = 30 } = {}) => {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { connected } = useHealthConnection();

  return useQuery({
    queryKey: ["health", "weight", authUserId, days],
    enabled: !!authUserId && connected,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      getBodyWeight({ startDate: daysAgo(days - 1), endDate: new Date() }),
  });
};
