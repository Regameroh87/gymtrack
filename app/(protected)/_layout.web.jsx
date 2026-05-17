// React Native
import { View, Text } from "react-native";

// Librerías
import { Slot, Redirect } from "expo-router";

// Hooks
import { useAuth } from "../../src/auth/lib/getSession";

export default function ProtectedLayoutWeb() {
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

  return <Slot />;
}
