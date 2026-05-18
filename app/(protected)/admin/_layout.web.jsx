import { View } from "react-native";
import { Slot } from "expo-router";

import AdminSidebar from "../../../src/components/admin/AdminSidebar.web";
import { ui } from "../../../src/theme/colors";

export default function AdminLayoutWeb() {
  return (
    <View
      style={{
        flexDirection: "row",
        height: "100vh",
        backgroundColor: ui.background.light,
      }}
    >
      <AdminSidebar />
      <View style={{ flex: 1, height: "100vh", overflow: "hidden" }}>
        <Slot />
      </View>
    </View>
  );
}
