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
          headerShown: false,
          unmountOnBlur: true,
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
        name="equipments/index"
        options={{
          title: "Inventario",
        }}
      />
      <Stack.Screen
        name="equipments/add"
        options={{
          title: "Nueva Máquina",
        }}
      />
      <Stack.Screen
        name="sessions/index"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="sessions/[id]"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="sessions/builder"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      {/* Planes */}
      <Stack.Screen name="plans/index" options={{ title: "Planes" }} />
      <Stack.Screen name="plans/builder" options={{ title: "Armar Plan" }} />
      <Stack.Screen
        name="plans/[id]/index"
        options={{ title: "Detalle de Plan" }}
      />
      <Stack.Screen
        name="plans/[id]/assign"
        options={{ title: "Asignar a Alumnos" }}
      />
      {/* Placeholders */}
      <Stack.Screen name="billing/index" options={{ title: "Contabilidad" }} />
      <Stack.Screen
        name="settings/index"
        options={{ title: "Configuración" }}
      />
      <Stack.Screen name="reports/index" options={{ title: "Reportes" }} />
    </Stack>
  );
}
