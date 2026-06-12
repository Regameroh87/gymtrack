// React Native
import { View, ActivityIndicator, Platform } from "react-native";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";

// Hooks
import { useSessionForm } from "../../../../../src/hooks/sessions/use-session-form";

// Componentes
import FormSession from "../../../../../src/components/forms/FormSession";
import Screen from "../../../../../src/components/Screen";

// Tema / assets
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";

export default function SessionBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { brandPrimary } = useGymTheme();

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

  return (
    <Screen safe={Platform.OS === "android"}>
      <FormSession form={form} session={id ?? null} />
    </Screen>
  );
}
