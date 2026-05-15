// React Native
import { ActivityIndicator, View } from "react-native";

// Librerías externas
import { Slot, useLocalSearchParams, useRouter } from "expo-router";

// Hooks
import { useTrainingPlanForm } from "../../../../../src/hooks/useTrainingPlanForm";

// Contexto
import { PlanFormProvider } from "../../../../../src/contexts/PlanFormContext";

// Tema
import { brandPrimary } from "../../../../../src/theme/colors";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

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
      <Slot />
    </PlanFormProvider>
  );
}
