import { Stack, Redirect, usePathname } from "expo-router";
import { useAuth } from "../../src/auth/lib/getSession";
import { useActiveGym } from "../../src/contexts/active-gym-context";
import { View, Text, Platform } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ui } from "../../src/theme/colors.js";
import { useTheme } from "../../src/theme/theme";

export default function ProtectedLayout() {
  const { isLoggedIn, loading } = useAuth();
  const { needsSelection, loading: gymLoading } = useActiveGym();
  const { isDark } = useTheme();
  const pathname = usePathname();

  if (loading || gymLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando sesión...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Multi-gym: con más de una membresía y sin gym activo elegido, primero se
  // elige el gimnasio (el theme y los datos dependen del gym activo).
  if (needsSelection && pathname !== "/select-gym") {
    return <Redirect href="/select-gym" />;
  }

  return (
    <BottomSheetModalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="select-gym" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="profile/index"
          options={{
            headerShown: Platform.OS === "ios",
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
            headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
          }}
        />
      </Stack>
    </BottomSheetModalProvider>
  );
}
