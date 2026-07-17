"use client";

// useGymPermissions(): permisos efectivos de la persona en el gym activo,
// combinando su rol (useUserRole) con los grants explícitos de su membership
// (membership_permissions). Fuente única para gatear acciones y módulos del
// panel; espeja el hook homónimo de apps/mobile.
//
// `loading` importa: hasGymPermission es fail-closed cuando los grants aún no
// cargaron, así que la UI debe esperar antes de decidir que algo NO se ve, o el
// módulo parpadearía y desaparecería. La RLS sigue siendo la autoridad real.

import { useMemo } from "react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { hasGymPermission } from "@gymtrack/core/permissions";
import { canAccessModule } from "@gymtrack/core/roles";
import { useMembershipPermissions } from "@gymtrack/core/hooks/users/use-membership-permissions";

export function useGymPermissions() {
  const { gymId, role, memberships } = useActiveGym();

  const membershipId = useMemo(
    () => memberships.find((m) => m.gym_id === gymId)?.id ?? null,
    [memberships, gymId]
  );

  const { data: grants, isLoading } = useMembershipPermissions(membershipId);

  return useMemo(
    () => ({
      role,
      grants: grants ?? [],
      // Sin membership propia no hay query (enabled:false), no es que esté cargando.
      loading: !!membershipId && isLoading,
      can: (permission: string) => hasGymPermission(role, grants ?? [], permission),
      canAccessModule: (path: string) => canAccessModule(role, path, grants ?? []),
    }),
    [role, grants, membershipId, isLoading]
  );
}
