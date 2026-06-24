"use client";

// useUserRole(): rol efectivo derivado del gym activo. Espeja exactamente el hook
// de apps/mobile/src/hooks/shared/use-user-role.js para migrar pantallas sin cambios.

// Contexto y helpers de roles
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { ROLES, isStaffRole, isAdminRole, isSuperAdminRole } from "@/lib/auth/roles";

export function useUserRole() {
  const { role } = useActiveGym();

  const isSuperAdmin = isSuperAdminRole(role);
  const isOwner = role === ROLES.OWNER;
  const isCoach = role === ROLES.COACH;
  const isAdmin = isAdminRole(role); // super_admin / owner / admin
  const isStaff = isStaffRole(role); // + coach
  const isMember = !isStaff;

  return {
    role,
    isSuperAdmin,
    isOwner,
    isAdmin,
    isCoach,
    isStaff,
    isMember,
    isStudent: isMember, // alias legacy
    loading: false,
  };
}
