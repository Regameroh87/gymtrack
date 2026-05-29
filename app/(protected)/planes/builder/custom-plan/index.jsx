// React Native
import { ActivityIndicator, Pressable, View } from "react-native";

// Librerías externas
import { Stack, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Contexto
import { usePlanFormContext } from "../../../../../src/contexts/PlanFormContext";

// Componentes
import FormTrainingPlan from "../../../../../src/components/forms/FormTrainingPlan";

// Tema y assets
import { brandPrimary, ui } from "../../../../../src/theme/colors";
import { ArrowLeft } from "../../../../../assets/icons";

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
            <Pressable
              onPress={() => router.navigate("/planes")}
              hitSlop={10}
              className="active:opacity-50"
            >
              <ArrowLeft
                size={22}
                color={isDark ? ui.text.mainDark : ui.text.main}
              />
            </Pressable>
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
