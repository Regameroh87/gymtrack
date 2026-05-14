// React Native
import { ActivityIndicator, View } from "react-native";

// Librerías externas
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Hooks
import { useTrainingPlanForm } from "../../../../../src/hooks/useTrainingPlanForm";

// Contexto
import { PlanFormProvider } from "../../../../../src/contexts/PlanFormContext";

// Tema
import { brandPrimary, ui } from "../../../../../src/theme/colors";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return (
    <PlanFormProvider value={{ form, planId: id ?? null }}>
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
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="[week]" options={{ headerShown: false }} />
      </Stack>
    </PlanFormProvider>
  );
}
