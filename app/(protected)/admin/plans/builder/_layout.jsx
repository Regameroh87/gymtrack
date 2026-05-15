// Librerías externas
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Hooks
import { useTrainingPlanForm } from "../../../../../src/hooks/useTrainingPlanForm";

// Contexto
import { PlanFormProvider } from "../../../../../src/contexts/PlanFormContext";

// Tema y assets
import { ui } from "../../../../../src/theme/colors";

export default function PlanBuilderLayout() {
  const { id } = useGlobalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack
        screenOptions={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerStyle: {
            backgroundColor: isDark ? ui.background.dark : ui.background.light,
          },
          headerShadowVisible: false,
          headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
        }}
      >
        <Stack.Screen name="[week]/index" />
      </Stack>
    </PlanFormProvider>
  );
}
