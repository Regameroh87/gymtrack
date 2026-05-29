import { ActivityIndicator, View } from "react-native";

import { usePlanFormContext } from "../../../../src/contexts/PlanFormContext";
import FormTrainingPlan from "../../../../src/components/forms/FormTrainingPlan";
import { brandPrimary } from "../../../../src/theme/colors";

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
    <FormTrainingPlan
      form={form}
      plan={planId}
      simplified
      weekPathname="/planes/builder/[week]"
    />
  );
}
