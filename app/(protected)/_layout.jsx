import { Tabs, Redirect } from "expo-router";
import { Barbell, Home, Logs } from "../../assets/icons";
import { useUser } from "../../src/auth/lib/authContext.js";

export default function ProtectedLayout() {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
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
