// React Native
import { View, ActivityIndicator } from "react-native";

// Librerías externas
import { useLocalSearchParams } from "expo-router";

// Hooks
import { useSessionForm } from "../../../../src/hooks/useSessionForm";

// Componentes
import FormSession from "../../../../src/components/forms/FormSession";

// Tema / assets
import { brandPrimary } from "../../../../src/theme/colors";

export default function SessionBuilder() {
  const { id } = useLocalSearchParams();
  const { form, isLoading } = useSessionForm({ id: id ?? null });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return <FormSession form={form} session={id ?? null} />;
}
