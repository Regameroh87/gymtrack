// Librerías externas
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Hooks
import { useCustomTrainingPlanForm } from "../../../../src/hooks/plans/use-custom-training-plan-form";

// Contexto
import { PlanFormProvider } from "../../../../src/contexts/PlanFormContext";

// Tema
import { ui } from "../../../../src/theme/colors";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { form, isLoading } = useCustomTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: isDark ? ui.background.dark : ui.background.light,
          },
          headerTitleStyle: {
            fontFamily: "Lexend_700Bold",
            color: isDark ? ui.text.mainDark : ui.text.main,
          },
          headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
        }}
      />
    </PlanFormProvider>
  );
}
