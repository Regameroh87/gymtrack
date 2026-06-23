import { useState } from "react";
import { View, useWindowDimensions, Pressable, Text } from "react-native";
import { Slot, Redirect } from "expo-router";

import PlatformSidebar from "../../../../src/components/admin/PlatformSidebar.web";
import { useUserRole } from "../../../../src/hooks/shared/use-user-role";
import { Menu } from "../../../../assets/icons";

// Zona de plataforma: solo el super_admin. Es su "home base" (no es dueño de un
// gym): lista de gimnasios y configuraciones de plataforma. Cualquier otro rol
// se manda al inicio.
export default function PlatformLayoutWeb() {
  const { isSuperAdmin, loading } = useUserRole();
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isMobile = width < 768;

  if (loading) return null;
  if (!isSuperAdmin) return <Redirect href="/" />;

  if (isMobile) {
    return (
      <View className="flex-1 h-screen bg-ui-background-light flex-col">
        {/* Header Móvil */}
        <View className="flex-row items-center h-[56px] px-4 bg-[#0C0B14] justify-between border-b border-white/5">
          <Pressable
            onPress={() => setIsSidebarOpen(true)}
            className="w-9 h-9 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
            style={{ cursor: "pointer" }}
          >
            <Menu size={20} color="#fff" />
          </Pressable>
          <Text className="text-white font-jakarta-bold text-sm tracking-tight">
            GymTrack Plataforma
          </Text>
          <View className="w-9" />
        </View>

        {/* Content */}
        <View className="flex-1 h-screen overflow-hidden">
          <Slot />
        </View>

        {/* Drawer Sidebar */}
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <Pressable
              onPress={() => setIsSidebarOpen(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 999,
              }}
            />
            {/* Sidebar container */}
            <View
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 1000,
              }}
            >
              <PlatformSidebar
                isMobile={true}
                onClose={() => setIsSidebarOpen(false)}
              />
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View className="flex-row h-screen bg-ui-background-light">
      <PlatformSidebar />
      <View className="flex-1 h-screen overflow-hidden">
        <Slot />
      </View>
    </View>
  );
}

