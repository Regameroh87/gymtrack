// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Permisos otorgados explícitamente a una membership (grants de
// membership_permissions), para gatear acciones sensibles (anular pago) o para
// que el owner vea/edite qué le otorgó a cada miembro. Devuelve un array de
// strings de permiso (p.ej. ["payments.void"]); vacío si no tiene grants.
export const useMembershipPermissions = (membershipId) => {
  return useQuery({
    queryKey: ["membership_permissions", membershipId],
    enabled: !!membershipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_permissions")
        .select("permission")
        .eq("membership_id", membershipId);
      if (error) throw error;
      return (data ?? []).map((r) => r.permission);
    },
  });
};
