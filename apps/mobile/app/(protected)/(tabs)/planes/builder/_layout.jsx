// Librerías externas
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, View } from "react-native";

// Assets
import { ChevronLeft } from "../../../../../assets/icons";

// Hooks
import { useCustomTrainingPlanForm } from "../../../../../src/hooks/plans/use-custom-training-plan-form";

// Contexto
import { PlanFormProvider } from "../../../../../src/contexts/PlanFormContext";

import { ui } from "@gymtrack/core/colors";
import { useTheme } from "../../../../../src/theme/theme";

export default function PlanBuilderLayout() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { form, isLoading } = useCustomTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack
        screenOptions={{
          headerShown: Platform.OS === "ios",
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
        }}
      >
        <Stack.Screen
          name="custom-plan/index"
          options={{
            headerShown: Platform.OS === "ios",
            headerLeft: () => (
              <Pressable
                onPress={() => router.replace("/planes")}
                hitSlop={8}
                className="-ml-5 active:opacity-70"
              >
                <View>
                  <ChevronLeft
                    size={30}
                    color={isDark ? ui.text.mainDark : ui.text.main}
                  />
                </View>
              </Pressable>
            ),
          }}
        />
      </Stack>
    </PlanFormProvider>
  );
}
