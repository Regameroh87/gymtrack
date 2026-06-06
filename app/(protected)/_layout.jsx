import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/auth/lib/getSession";
import { View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ui } from "../../src/theme/colors.js";
import { useTheme } from "../../src/theme/theme";

export default function ProtectedLayout() {
  const { isLoggedIn, loading } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando sesión...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <BottomSheetModalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="profile/index"
          options={{
            headerShown: true,
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
            headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
            ...(Platform.OS === "android" && {
              headerStyle: { height: insets.top },
            }),
          }}
        />
      </Stack>
    </BottomSheetModalProvider>
  );
}
