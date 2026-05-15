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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="users/index"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="users/register"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="exercises/index"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="exercises/builder"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="exercises/[id]"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="equipments/index"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="equipments/add"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
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
      <Stack.Screen
        name="plans/index"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="plans/builder"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="plans/builder/[week]"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="plans/[id]"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
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
