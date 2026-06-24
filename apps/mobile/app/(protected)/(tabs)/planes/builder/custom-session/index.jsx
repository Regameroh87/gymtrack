import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useCustomSessionForm } from "../../../../../../src/hooks/sessions/use-custom-session-form";
import FormSession from "../../../../../../src/components/forms/FormSession";
import { useGymTheme } from "../../../../../../src/contexts/gym-theme-context";

export default function UserSessionBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { brandPrimary } = useGymTheme();

  const { form, isLoading } = useCustomSessionForm({
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
    <>
      <FormSession
        form={form}
        session={id ?? null}
        hideImage
        hideDescription
        hideLevel
      />
    </>
  );
}
