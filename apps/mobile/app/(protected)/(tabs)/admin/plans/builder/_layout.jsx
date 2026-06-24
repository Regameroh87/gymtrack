// Librerías externas
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Hooks
import { useTrainingPlanForm } from "../../../../../../src/hooks/plans/use-training-plan-form";

// Contexto
import { PlanFormProvider } from "../../../../../../src/contexts/PlanFormContext";

// Tema y assets
import { ui } from "../../../../../../src/theme/colors";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();

  const router = useRouter();

  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="[week]/index" />
        <Stack.Screen name="[week]/[day]/index" />
      </Stack>
    </PlanFormProvider>
  );
}
