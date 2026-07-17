// useGymPermissions(): permisos efectivos de la persona en el gym activo,
// combinando su rol con los grants explícitos de su membership
// (membership_permissions). Fuente única para gatear acciones y módulos del
// panel; espeja el hook homónimo de apps/web.
//
// `loading` importa: hasGymPermission es fail-closed cuando los grants aún no
// cargaron, así que la UI debe esperar antes de decidir que algo NO se ve, o el
// módulo parpadearía y desaparecería. La RLS sigue siendo la autoridad real.

import { useMemo } from "react";

import { useActiveGym } from "../../contexts/active-gym-context";
import { useUserRole } from "./use-user-role";
import { hasGymPermission } from "@gymtrack/core/permissions";
import { canAccessModule } from "@gymtrack/core/roles";
import { useMembershipPermissions } from "@gymtrack/core/hooks/users/use-membership-permissions";

export const useGymPermissions = () => {
  const { activeMembership } = useActiveGym();
  const { role } = useUserRole();

  const membershipId = activeMembership?.id ?? null;
  const { data: grants, isLoading } = useMembershipPermissions(membershipId);

  return useMemo(
    () => ({
      role,
      grants: grants ?? [],
      // Sin membership propia no hay query (enabled:false), no es que esté cargando.
      loading: !!membershipId && isLoading,
      can: (permission) => hasGymPermission(role, grants ?? [], permission),
      canAccessModule: (path) => canAccessModule(role, path, grants ?? []),
    }),
    [role, grants, membershipId, isLoading]
  );
};
