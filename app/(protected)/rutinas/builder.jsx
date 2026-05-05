// React Native
import { ActivityIndicator, View } from "react-native";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";

// Hooks
import { useAuth } from "../../../src/auth/lib/getSession";
import { useTrainingPlanForm } from "../../../src/hooks/useTrainingPlanForm";

// Componentes
import FormTrainingPlan from "../../../src/components/forms/FormTrainingPlan";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";

export default function StudentPlanBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userId } = useAuth();

  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    kind: "personal",
    ownerUserId: userId,
    onSuccess: () => router.back(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return <FormTrainingPlan form={form} plan={id ?? null} />;
}
