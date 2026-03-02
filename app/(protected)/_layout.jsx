import { Tabs, Redirect } from "expo-router";
import { Barbell, Home, Logs } from "../../assets/icons";
import { useAuth } from "../../src/auth/lib/getSession";
import { View, Text } from "react-native";

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
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "GYMTRACK",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color }) => (
            <Home color={color} width={24} height={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="registros"
        options={{
          title: "Registros",
          tabBarIcon: ({ color }) => (
            <Logs color={color} width={24} height={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="rutinas/index"
        options={{
          title: "Rutinas",
          tabBarIcon: ({ color }) => (
            <Barbell color={color} width={24} height={24} />
          ),
        }}
      />
    </Tabs>
  );
}
