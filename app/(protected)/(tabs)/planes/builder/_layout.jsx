// Librerías externas
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

// Hooks
import { useCustomTrainingPlanForm } from "../../../../../src/hooks/plans/use-custom-training-plan-form";

// Contexto
import { PlanFormProvider } from "../../../../../src/contexts/PlanFormContext";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { form, isLoading } = useCustomTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack screenOptions={{ headerShown: false }} />
    </PlanFormProvider>
  );
}
