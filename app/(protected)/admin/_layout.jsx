import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { ui } from "../../../src/theme/colors";

export default function AdminLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontFamily: "Lexend_700Bold",
          color: isDark ? ui.text.mainDark : ui.text.main,
        },
        headerStyle: {
          backgroundColor: isDark ? ui.background.dark : ui.background.light,
        },
        headerShadowVisible: false,
        headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Admin",
          headerShown: false, // Usamos AdminHeader custom en el index
        }}
      />
      <Stack.Screen
        name="users/index"
        options={{
          title: "Usuarios",
        }}
      />
      <Stack.Screen
        name="users/register"
        options={{
          title: "Nuevo Socio",
        }}
      />
      <Stack.Screen
        name="exercises/index"
        options={{
          title: "Ejercicios",
        }}
      />
      <Stack.Screen
        name="exercises/add"
        options={{
          title: "Nuevo Ejercicio",
        }}
      />
      <Stack.Screen
        name="routines/index"
        options={{
          title: "Rutinas",
        }}
      />
      <Stack.Screen
        name="routines/builder"
        options={{
          title: "Armar Rutina",
        }}
      />
      {/* Placeholders */}
      <Stack.Screen name="billing/index" options={{ title: "Contabilidad" }} />
      <Stack.Screen name="settings/index" options={{ title: "Configuración" }} />
      <Stack.Screen name="reports/index" options={{ title: "Reportes" }} />
    </Stack>
  );
}
