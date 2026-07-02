import { useQuery } from "@tanstack/react-query";

import { getDailyActivity, daysAgo } from "../../lib/health";
import { useAuth } from "../../auth/lib/getSession";
import { useHealthConnection } from "./use-health-connection";

// Actividad diaria (pasos, kcal activas, distancia) leída del health store
// del device — funciona offline. Key por auth uid para que un cambio de
// cuenta no muestre caché ajena.
export const useDailyActivity = ({ days = 7 } = {}) => {
  const { session } = useAuth();
  const authUserId = session?.user?.id;
  const { connected } = useHealthConnection();

  return useQuery({
    queryKey: ["health", "activity", authUserId, days],
    enabled: !!authUserId && connected,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      getDailyActivity({ startDate: daysAgo(days - 1), endDate: new Date() }),
  });
};
