import { Tabs, Redirect } from "expo-router";
import { Barbell, Home, Logs } from "../../assets/icons";
import { useAuth } from "../../src/auth/lib/getSession";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";

export default function ProtectedLayout() {
  const { isLoggedIn, loading } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  console.log("colorScheme", colorScheme);

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
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerRight: () => (
          <Pressable
            onPress={() => toggleColorScheme()}
            className="mr-4 bg-gray-200 p-2 rounded-lg active:bg-gray-300"
          >
            <Text className="text-xs font-bold text-gray-800">theme</Text>
          </Pressable>
        ),
      }}
    >
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
