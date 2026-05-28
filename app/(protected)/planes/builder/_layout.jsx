import { Stack, useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";

import { useTrainingPlanForm } from "../../../../src/hooks/useTrainingPlanForm";
import { PlanFormProvider } from "../../../../src/contexts/PlanFormContext";
import { ui } from "../../../../src/theme/colors";

export default function UserPlanBuilderLayout() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { id } = useLocalSearchParams();
  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack
        screenOptions={{
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerStyle: {
            backgroundColor: isDark ? ui.background.dark : ui.background.light,
          },
          headerShadowVisible: false,
          headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
        }}
      >
        <Stack.Screen name="[week]/index" />
      </Stack>
    </PlanFormProvider>
  );
}
