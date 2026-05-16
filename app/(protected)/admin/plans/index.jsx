// React Native
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks
import { useTrainingPlans } from "../../../../src/hooks/useTrainingPlans";

// Componentes
import Screen from "../../../../src/components/Screen";
import TrainingPlanCard from "../../../../src/components/cards/TrainingPlanCard";
import ButtonAddPill from "../../../../src/components/buttons/ButtonAddPill";

// Tema / assets
import { brandPrimary } from "../../../../src/theme/colors";
import { ClipboardList, Plus } from "../../../../assets/icons";

export default function PlansList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: plans = [], isLoading } = useTrainingPlans();

  const handleNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/admin/plans/builder");
  };

  return (
    <Screen>
      {/* Header sticky */}
      <View className="px-6 pt-4 pb-5 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Gestión de Entrenamientos
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Planes
          </Text>
          {plans.length > 0 && (
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest mt-1">
              {plans.length} {plans.length === 1 ? "plan" : "planes"}
            </Text>
          )}
        </View>

        <ButtonAddPill onPress={handleNew} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={brandPrimary[500]} />
          </View>
        ) : plans.length === 0 ? (
          <View className="mx-5 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
              <ClipboardList size={32} color={brandPrimary[600]} />
            </View>
            <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
              No hay planes creados
            </Text>
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
              Creá planes con días numerados y rutinas asignadas.
            </Text>
            <Pressable
              onPress={handleNew}
              className="w-full active:scale-[0.98]"
            >
              <LinearGradient
                colors={[brandPrimary[600], brandPrimary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3.5 rounded-xl items-center flex-row justify-center"
              >
                <Plus size={18} color="white" />
                <Text className="text-white font-jakarta-semi text-sm ml-2">
                  Nuevo Plan
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View className="px-5 gap-5">
            {plans.map((plan) => (
              <TrainingPlanCard
                key={plan.id}
                plan={plan}
                onPress={(p) => router.push(`/admin/plans/${p.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
