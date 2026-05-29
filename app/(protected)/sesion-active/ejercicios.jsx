import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useMemo, useRef, useState } from "react";

import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

import { brandPrimary, brandSecondary, ui } from "../../../src/theme/colors.js";
import { ChevronRight, Play } from "../../../assets/icons.jsx";

import { useActivePlanSummary } from "../../../src/hooks/plans/use-active-plan-summary";
import { usePlanDayExercises } from "../../../src/hooks/plans/use-plan-day-exercises";

import { getCloudinaryUrl } from "../../../src/utils/cloudinary";

import PlanExerciseRow from "../../../src/components/cards/plan-exercise-row";
import VideoPlayerSheet from "../../../src/components/videos/VideoPlayerSheet";

const BRAND_PRIMARY = brandPrimary[700];
const BRAND_PRIMARY_DEEP = brandPrimary[600];
const BRAND_MINT = brandSecondary[400];

export default function SesionEjercicios() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id);

  const videoSheetRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const handleVideoPress = ({ url, title }) => {
    setActiveVideo({ url, title });
    videoSheetRef.current?.present();
  };

  const session = useMemo(() => {
    if (!summary || !currentDay) return null;
    return {
      sessionName: currentDay.session?.name ?? summary.plan.name,
      exercises: dayExercises,
    };
  }, [summary, currentDay, dayExercises]);

  if (loadingSummary || (currentDay && loadingExercises)) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 36,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header con back ── */}
        <View className="flex-row items-center gap-3 mb-6">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={10}
            className="w-9 h-9 rounded-full items-center justify-center border bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10 active:opacity-60"
          >
            <ChevronRight
              size={16}
              color={mutedColor}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          </Pressable>
          <Text
            className="flex-1 font-jakarta-bold text-[17px] tracking-[-0.4px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {session?.sessionName ?? "Sesión"}
          </Text>
        </View>

        {/* ── Section label ── */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-4 h-0.5 rounded-[1px] bg-brandSecondary-400" />
          <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
            Ejercicios
          </Text>
          <View className="flex-1 h-px bg-ui-text-main/[6%] dark:bg-white/[6%]" />
        </View>

        {/* ── Lista completa ── */}
        <View className="gap-2.5 mb-9">
          {(session?.exercises ?? []).map((ex, idx) => (
            <PlanExerciseRow
              key={ex.id}
              exercise={ex}
              position={idx + 1}
              onVideoPress={handleVideoPress}
            />
          ))}
        </View>

        {/* ── CTA: Iniciar sesión ── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.replace("/(protected)/sesion-active/activa");
          }}
          className="active:opacity-90"
        >
          <LinearGradient
            colors={[BRAND_PRIMARY, BRAND_PRIMARY_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              paddingVertical: 20,
              paddingHorizontal: 26,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: BRAND_PRIMARY,
              shadowOpacity: 0.55,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            }}
          >
            <Text className="font-jakarta-bold text-[17px] tracking-[-0.3px] text-white">
              Iniciar sesión
            </Text>
            <View className="w-[38px] h-[38px] rounded-full items-center justify-center bg-white/20">
              <Play size={17} color="white" />
            </View>
          </LinearGradient>
        </Pressable>
      </ScrollView>

      <VideoPlayerSheet
        sheetRef={videoSheetRef}
        videoUrl={activeVideo?.url}
        title={activeVideo?.title}
      />
    </View>
  );
}
