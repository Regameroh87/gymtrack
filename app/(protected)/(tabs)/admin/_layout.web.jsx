import { View } from "react-native";
import { Slot, Redirect } from "expo-router";

import AdminSidebar from "../../../../src/components/admin/AdminSidebar.web";
import { useUserRole } from "../../../../src/hooks/shared/use-user-role";
import { useActiveGym } from "../../../../src/contexts/active-gym-context";

export default function AdminLayoutWeb() {
  const { isStaff, isSuperAdmin, loading } = useUserRole();
  const { gymId } = useActiveGym();

  // Solo el staff accede al panel. Bloquea el ingreso por URL de un member.
  if (loading) return null;
  if (!isStaff) return <Redirect href="/" />;

  // El super_admin sin gym activo no tiene contexto operativo (theme/datos
  // colgarían): se lo manda a su panel de plataforma.
  if (isSuperAdmin && !gymId) return <Redirect href="/platform" />;

  return (
    <View className="flex-row h-screen bg-ui-background-light">
      <AdminSidebar />
      <View className="flex-1 h-screen overflow-hidden">
        <Slot />
      </View>
    </View>
  );
}
