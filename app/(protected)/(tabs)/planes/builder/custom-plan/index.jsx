// React Native
import { ActivityIndicator, Platform, View } from "react-native";

// Contexto
import { usePlanFormContext } from "../../../../../../src/contexts/PlanFormContext";

// Componentes
import FormTrainingPlan from "../../../../../../src/components/forms/FormTrainingPlan";

// Tema
import { brandPrimary } from "../../../../../../src/theme/colors";

export default function UserPlanBuilder() {
  const { form, planId, isLoading } = usePlanFormContext();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return (
    <>
      <View className={`${Platform.OS === "ios" ? "pt-0" : "pt-20"} flex-1`}>
        <FormTrainingPlan
          form={form}
          plan={planId}
          simplified
          weekPathname="/planes/builder/custom-plan/[week]"
        />
      </View>
    </>
  );
}
