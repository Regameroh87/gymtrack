// Librerías externas
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

// Tema
import { ui } from "../../../src/theme/colors";

export default function PlanesLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="plan/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="builder/custom-plan/index"
        options={{ title: "", headerBackButtonDisplayMode: "minimal" }}
      />
      <Stack.Screen
        name="builder/custom-plan/[week]/index"
        options={{ title: "", headerBackButtonDisplayMode: "minimal" }}
      />
    </Stack>
  );
}
