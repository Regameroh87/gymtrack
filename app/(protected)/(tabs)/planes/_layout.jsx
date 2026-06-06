// Librerías externas
import { Stack } from "expo-router";
import { Platform } from "react-native";

// Tema
import { ui } from "../../../../src/theme/colors";
import { useTheme } from "../../../../src/theme/theme";

export default function PlanesLayout() {
  const { isDark } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="builder"
        options={{
          headerShown: Platform.OS === "ios",
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: isDark ? ui.mutedDark : ui.mutedLigth,
        }}
      />
    </Stack>
  );
}
