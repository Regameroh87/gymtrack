import { Stack, Redirect } from "expo-router";
import { useColorScheme } from "nativewind";
import { ui } from "@gymtrack/core/colors";
import { useUserRole } from "../../../../src/hooks/shared/use-user-role";
import { Platform } from "react-native";

export default function AdminLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isStaff, role, loading } = useUserRole();

  // Solo el staff accede al panel. Bloquea el ingreso por URL de un member.
  // role aún null (gym no auto-seleccionado todavía) ⇒ seguimos esperando, no
  // expulsamos: un staff tiene una ventana transitoria con role=null tras el
  // login y no debe ser tratado como member.
  if (loading || role == null) return null;
  if (!isStaff) return <Redirect href="/(protected)/(tabs)/(home)/index" />;

  return (
    <Stack
      screenOptions={{
        // Header nativo solo en iOS; Android compensa con safe area en cada pantalla.
        headerShown: Platform.OS === "ios",
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
        name="users/[id]"
        options={{
          headerTitle: "Ficha del alumno",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="users/edit/[id]"
        options={{
          headerTitle: "Editar alumno",
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
        name="plans/[id]"
        options={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      {/* Placeholders */}
      <Stack.Screen
        name="billing/index"
        options={{
          title: "Contabilidad",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="settings/index"
        options={{
          title: "Configuración",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="reports/index"
        options={{
          title: "Reportes",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </Stack>
  );
}
