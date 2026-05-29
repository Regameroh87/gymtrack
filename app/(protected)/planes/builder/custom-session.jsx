import { View, ActivityIndicator } from "react-native";
import { HeaderBackButton } from "@react-navigation/elements";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

import { useCustomSessionForm } from "../../../../src/hooks/sessions/use-custom-session-form";
import FormSession from "../../../../src/components/forms/FormSession";
import { brandPrimary, ui } from "../../../../src/theme/colors";

export default function UserSessionBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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
      <Stack.Screen
        options={{
          headerLeft: () => (
            <View style={{ marginLeft: -16 }}>
              <HeaderBackButton
                displayMode="minimal"
                tintColor={isDark ? ui.text.mainDark : ui.text.main}
                onPress={() => router.back()}
              />
            </View>
          ),
        }}
      />
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
