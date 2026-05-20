// Librerías externas
import { useAuth } from "../auth/lib/getSession";

const STAFF_ROLES = ["owner", "admin", "coach"];

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const role = user?.role ?? null;
  const isAdmin = !!user?.is_admin;
  const isStaff = STAFF_ROLES.includes(role);

  return { role, isAdmin, isStaff, isStudent: !isAdmin, loading };
};
