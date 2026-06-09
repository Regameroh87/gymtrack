// React Native
import { ActivityIndicator, View } from "react-native";

// Contexto
import { usePlanFormContext } from "../../../../../../src/contexts/PlanFormContext";

// Componentes
import FormTrainingPlan from "../../../../../../src/components/forms/FormTrainingPlan";

// Tema y assets
import { useGymTheme } from "../../../../../../src/contexts/gym-theme-context";

export default function PlanBuilder() {
  const { form, planId, isLoading } = usePlanFormContext();
  const { brandPrimary } = useGymTheme();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return <FormTrainingPlan form={form} plan={planId} />;
}
