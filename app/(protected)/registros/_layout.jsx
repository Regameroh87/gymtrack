// Librerías externas
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useColorScheme } from "nativewind";

// Tema
import { ui } from "../../../src/theme/colors";

export default function RegistrosLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="nuevo" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="[id]"
        options={
          Platform.OS === "ios"
            ? {
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: isDark
                    ? ui.background.dark
                    : ui.background.light,
                },
                headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
              }
            : {}
        }
      />
    </Stack>
  );
}
