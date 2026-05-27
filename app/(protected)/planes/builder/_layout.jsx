import { Stack, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useForm } from "@tanstack/react-form";

import { buildEmptyWeeks } from "../../../../src/hooks/useTrainingPlanForm";
import { PlanFormProvider } from "../../../../src/contexts/PlanFormContext";
import { ui } from "../../../../src/theme/colors";

export default function UserPlanBuilderLayout() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const form = useForm({
    defaultValues: {
      name: "",
      objective: "",
      duration_weeks: 0,
      weekly_days: 3,
      weeks: buildEmptyWeeks(1, 3),
    },
    onSubmit: async ({ value }) => {
      console.log("PLAN →", JSON.stringify(value, null, 2));
      router.back();
    },
  });

  return (
    <PlanFormProvider value={{ form, planId: null, isLoading: false }}>
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
