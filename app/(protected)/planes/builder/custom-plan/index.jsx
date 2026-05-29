// React Native
import { ActivityIndicator, View } from "react-native";

// React Navigation
import { HeaderBackButton } from "@react-navigation/elements";

// Librerías externas
import { Stack, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Contexto
import { usePlanFormContext } from "../../../../../src/contexts/PlanFormContext";

// Componentes
import FormTrainingPlan from "../../../../../src/components/forms/FormTrainingPlan";

// Tema
import { brandPrimary, ui } from "../../../../../src/theme/colors";

export default function UserPlanBuilder() {
  const { form, planId, isLoading } = usePlanFormContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

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
                onPress={() => router.navigate("/planes")}
              />
            </View>
          ),
        }}
      />
      <FormTrainingPlan
        form={form}
        plan={planId}
        simplified
        weekPathname="/planes/builder/custom-plan/[week]"
      />
    </>
  );
}
