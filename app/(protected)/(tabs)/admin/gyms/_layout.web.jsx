import { Slot, Redirect } from "expo-router";

import { useUserRole } from "../../../../../src/hooks/shared/use-user-role";

export default function GymsLayoutWeb() {
  const { isSuperAdmin, loading } = useUserRole();

  // Sección cross-gym: solo el super_admin gestiona gimnasios. Bloquea el
  // ingreso por URL de cualquier otro rol del staff.
  if (loading) return null;
  if (!isSuperAdmin) return <Redirect href="/admin" />;

  return <Slot />;
}
