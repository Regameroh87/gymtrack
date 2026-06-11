// Librerías externas
import { useActiveGym } from "../../contexts/active-gym-context";
import {
  ROLES,
  isStaffRole,
  isAdminRole,
  isSuperAdminRole,
} from "../../constants/roles";

export const useUserRole = () => {
  // Multi-gym: el rol es POR GYM (memberships.role del gym activo).
  // super_admin es un flag global de la persona y pisa al rol local.
  const { role, loading } = useActiveGym();

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
    // Alias legacy mantenido para no romper consumidores existentes.
    isStudent: isMember,
    loading,
  };
};
