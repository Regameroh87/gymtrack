// React Native
import { View, ActivityIndicator } from "react-native";

// Librerías externas
import { useLocalSearchParams } from "expo-router";

// Hooks
import { useRoutineForm } from "../../../../src/hooks/useRoutineForm";

// Componentes
import FormRoutine from "../../../../src/components/forms/FormRoutine";

// Tema / assets
import { brandPrimary } from "../../../../src/theme/colors";

export default function RoutineBuilder() {
  const { id } = useLocalSearchParams();
  const { form, isLoading } = useRoutineForm({ id: id ?? null });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return <FormRoutine form={form} routine={id ?? null} />;
}
