import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/auth/lib/getSession";
import { View, Text } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function ProtectedLayout() {
  const { isLoggedIn, loading } = useAuth();

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
          name="profile"
          options={{ headerShown: true, title: "Perfil" }}
        />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="sesion-active" />
      </Stack>
    </BottomSheetModalProvider>
  );
}
