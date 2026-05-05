// Librerías externas
import { useAuth } from "../auth/lib/getSession";

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const isAdmin = !!user?.is_admin;

  return { isAdmin, isStudent: !isAdmin, loading };
};
