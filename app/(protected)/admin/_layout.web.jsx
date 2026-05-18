import { View } from "react-native";
import { Slot } from "expo-router";

import AdminSidebar from "../../../src/components/admin/AdminSidebar.web";

export default function AdminLayoutWeb() {
  return (
    <View className="flex-row h-screen bg-ui-background-light">
      <AdminSidebar />
      <View className="flex-1 h-screen overflow-hidden">
        <Slot />
      </View>
    </View>
  );
}
