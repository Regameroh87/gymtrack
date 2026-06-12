// React Native
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useCallback, useMemo, useState } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

// Hooks
import { useTrainingPlans } from "../../../../../src/hooks/plans/use-training-plans";

// Componentes
import Screen from "../../../../../src/components/Screen";
import TrainingPlanCard from "../../../../../src/components/cards/TrainingPlanCard";
import ButtonAddPill from "../../../../../src/components/buttons/ButtonAddPill";

// Tema / assets
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { ClipboardList, Plus } from "../../../../../assets/icons";

function AnimatedCard({ plan, onPress, scrollY, containerY, isDraft = false }) {
  const cardY = useSharedValue(0);
  const cardHeight = useSharedValue(1);

  const onLayout = useCallback(
    (e) => {
      cardY.value = e.nativeEvent.layout.y;
      cardHeight.value = e.nativeEvent.layout.height;
    },
    [cardY, cardHeight]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const absoluteY = containerY.value + cardY.value;
    const cardTop = absoluteY - scrollY.value;
    const opacity = interpolate(
      cardTop,
      [-cardHeight.value, 0],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <Animated.View style={animatedStyle} onLayout={onLayout}>
      <TrainingPlanCard plan={plan} onPress={onPress} isDraft={isDraft} />
    </Animated.View>
  );
}

const TABS = [
  { key: "published", label: "Publicados" },
  { key: "drafts", label: "Borradores" },
];

export default function PlansList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const { data: plans = [], isLoading } = useTrainingPlans();
  const scrollY = useSharedValue(0);
  const containerY = useSharedValue(0);
  const [activeTab, setActiveTab] = useState("published");

  const published = useMemo(() => plans.filter((p) => p.is_published), [plans]);
  const drafts = useMemo(() => plans.filter((p) => !p.is_published), [plans]);
  const visiblePlans = activeTab === "published" ? published : drafts;

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const handleNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/admin/plans/builder");
  };

  return (
    <Screen safe={Platform.OS === "android"}>
      {/* Header */}
      <View className="px-6 pb-4 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Gestión de Entrenamientos
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Planes
          </Text>
        </View>

        <ButtonAddPill onPress={handleNew} />
      </View>

      {/* Segmented control */}
      {!isLoading && plans.length > 0 && (
        <View className="mx-6 mb-4 flex-row bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-1">
          {TABS.map((tab) => {
            const count =
              tab.key === "published" ? published.length : drafts.length;
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab.key);
                }}
                className="flex-1 py-2 rounded-[9px] flex-row items-center justify-center"
                style={
                  isActive ? { backgroundColor: brandPrimary[500] } : undefined
                }
              >
                <Text
                  className={`text-[13px] font-jakarta-semi ${
                    isActive
                      ? "text-white"
                      : "text-ui-text-muted dark:text-ui-text-mutedDark"
                  }`}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    className={`ml-1.5 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${
                      isActive
                        ? "bg-white/20"
                        : "bg-ui-input-border dark:bg-ui-surface-dark"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-manrope-semi ${
                        isActive
                          ? "text-white"
                          : "text-ui-text-muted dark:text-ui-text-mutedDark"
                      }`}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
        ) : visiblePlans.length === 0 ? (
          <View className="mx-5 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
              <ClipboardList size={32} color={brandPrimary[600]} />
            </View>
            <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
              {activeTab === "published"
                ? "Sin planes publicados"
                : "Sin borradores"}
            </Text>
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 max-w-[240px]">
              {activeTab === "published"
                ? "Publicá un plan para que aparezca aquí."
                : "Los planes sin publicar aparecerán aquí."}
            </Text>
          </View>
        ) : (
          <View
            className="px-5"
            onLayout={(e) => {
              containerY.value = e.nativeEvent.layout.y;
            }}
          >
            <View className="gap-5">
              {visiblePlans.map((plan) => (
                <AnimatedCard
                  key={plan.id}
                  plan={plan}
                  scrollY={scrollY}
                  containerY={containerY}
                  onPress={(p) => router.push(`/admin/plans/${p.id}`)}
                  isDraft={!plan.is_published}
                />
              ))}
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}
