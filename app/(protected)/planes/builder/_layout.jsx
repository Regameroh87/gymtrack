// React Native
import { TouchableOpacity } from "react-native";

// Librerías externas
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

// Hooks
import { useTrainingPlanForm } from "../../../../src/hooks/useTrainingPlanForm";

// Contexto
import { PlanFormProvider } from "../../../../src/contexts/PlanFormContext";

// Tema / Assets
import { ui } from "../../../../src/theme/colors";
import { ArrowLeft } from "../../../../assets/icons";

export default function PlanBuilderLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { form, isLoading } = useTrainingPlanForm({
    id: id ?? null,
    onSuccess: () => router.back(),
  });

  const headerStyle = {
    backgroundColor: isDark ? ui.background.dark : ui.background.light,
  };
  const headerTitleStyle = {
    fontFamily: "Lexend_700Bold",
    color: isDark ? ui.text.mainDark : ui.text.main,
  };
  const headerTintColor = isDark ? ui.text.mainDark : ui.text.main;

  return (
    <PlanFormProvider value={{ form, planId: id ?? null, isLoading }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerShadowVisible: false,
          headerStyle,
          headerTitleStyle,
          headerTintColor,
        }}
      >
        <Stack.Screen
          name="custom-plan"
          options={{
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} className="pr-2">
                <ArrowLeft size={24} color={headerTintColor} />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </PlanFormProvider>
  );
}
