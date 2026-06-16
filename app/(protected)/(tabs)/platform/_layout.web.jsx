import { View } from "react-native";
import { Slot, Redirect } from "expo-router";

import PlatformSidebar from "../../../../src/components/admin/PlatformSidebar.web";
import { useUserRole } from "../../../../src/hooks/shared/use-user-role";

// Zona de plataforma: solo el super_admin. Es su "home base" (no es dueño de un
// gym): lista de gimnasios y configuraciones de plataforma. Cualquier otro rol
// se manda al inicio.
export default function PlatformLayoutWeb() {
  const { isSuperAdmin, loading } = useUserRole();

  if (loading) return null;
  if (!isSuperAdmin) return <Redirect href="/" />;

  return (
    <View className="flex-row h-screen bg-ui-background-light">
      <PlatformSidebar />
      <View className="flex-1 h-screen overflow-hidden">
        <Slot />
      </View>
    </View>
  );
}
