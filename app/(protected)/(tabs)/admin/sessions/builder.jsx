// React Native
import { View, ActivityIndicator } from "react-native";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";

// Hooks
import { useSessionForm } from "../../../../../src/hooks/sessions/use-session-form";

// Componentes
import FormSession from "../../../../../src/components/forms/FormSession";

// Tema / assets
import { brandPrimary } from "../../../../../src/theme/colors";

export default function SessionBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { form, isLoading } = useSessionForm({
    id: id ?? null,
    onSuccess: () => {
      router.back();
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return <FormSession form={form} session={id ?? null} />;
}
