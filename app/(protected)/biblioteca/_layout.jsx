import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { ui } from "../../../src/theme/colors";

export default function BibliotecaLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerTitle: "",
        headerBackButtonDisplayMode: "minimal",
        headerStyle: {
          backgroundColor: isDark ? ui.background.dark : ui.background.light,
        },
        headerShadowVisible: false,
        headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
        headercontentStyle: { paddingTop: 0 },
      }}
    />
  );
}
