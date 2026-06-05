// Librerías externas
import { useAuth } from "../../auth/lib/getSession";
import {
  ROLES,
  isStaffRole,
  isAdminRole,
  isSuperAdminRole,
} from "../../constants/roles";

export const useUserRole = () => {
  const { user, loading } = useAuth();

  // Fuente de verdad: profiles.role. Fallback legacy a is_admin solo si role
  // viniera null (perfiles viejos sin backfill).
  const role = user?.role ?? (user?.is_admin ? ROLES.ADMIN : null);

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
