// Librerías externas
import { Slot, useLocalSearchParams, useRouter } from "expo-router";

// Hooks
import { useTrainingPlanForm } from "../../../../src/hooks/useTrainingPlanForm";

// Contexto
import { PlanFormProvider } from "../../../../src/contexts/PlanFormContext";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Slot />
    </PlanFormProvider>
  );
}
