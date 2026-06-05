import { View } from "react-native";
import { Slot, Redirect } from "expo-router";

import AdminSidebar from "../../../src/components/admin/AdminSidebar.web";
import { useUserRole } from "../../../src/hooks/shared/use-user-role";

export default function AdminLayoutWeb() {
  const { isStaff, loading } = useUserRole();

  // Solo el staff accede al panel. Bloquea el ingreso por URL de un member.
  if (loading) return null;
  if (!isStaff) return <Redirect href="/" />;

  return (
    <View className="flex-row h-screen bg-ui-background-light">
      <AdminSidebar />
      <View className="flex-1 h-screen overflow-hidden">
        <Slot />
      </View>
    </View>
  );
}
