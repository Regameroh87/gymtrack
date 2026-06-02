import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";

import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";

import { brandPrimary, ui } from "../../../src/theme/colors.js";
import { Barbell, Play } from "../../../assets/icons.jsx";

import { useActivePlanSummary } from "../../../src/hooks/plans/use-active-plan-summary";
import { usePlanDayExercises } from "../../../src/hooks/plans/use-plan-day-exercises";
import { useActiveSessionDraft } from "../../../src/hooks/sessions/use-active-session-draft";

import { formatShortDate } from "../../../src/utils/format-date";
import PlanExerciseRow from "../../../src/components/cards/plan-exercise-row";
import VideoPlayerSheet from "../../../src/components/videos/VideoPlayerSheet";
import EquipmentImageSheet from "../../../src/components/images/EquipmentImageSheet";
import Screen from "../../../src/components/Screen.jsx";

export default function SesionPreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id);

  const videoSheetRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const equipmentSheetRef = useRef(null);
  const [activeEquipment, setActiveEquipment] = useState(null);

  // Sesión a medias (draft) del día que toca: mismo criterio que la card del home
  const { data: draft, refetch: refetchDraft } = useActiveSessionDraft();
  const hasDraft =
    !!draft && !!currentDay && String(draft.dayId) === String(currentDay.id);

  useFocusEffect(
    useCallback(() => {
      refetchDraft();
    }, [refetchDraft])
  );

  const handleVideoPress = ({ url, title }) => {
    setActiveVideo({ url, title });
    videoSheetRef.current?.present();
  };

  const handleEquipmentPress = ({ uri, name }) => {
    setActiveEquipment({ uri, name });
    equipmentSheetRef.current?.present();
  };

  const session = useMemo(() => {
    if (!summary || !currentDay) return null;
    const estimatedMinutes = Math.round(
      dayExercises.reduce((acc, ex) => {
        const perSet = (ex.rest_seconds ?? 90) + 45;
        return acc + ex.sets.length * perSet;
      }, 0) / 60
    );
    return {
      planName: summary.plan.name,
      dayLabel: `Día ${currentDay.day_number}`,
      weekNumber: summary.plan.duration_weeks === 0 ? null : currentDay.week_number,
      sessionName: currentDay.session?.name ?? summary.plan.name,
      exercises: dayExercises,
      estimatedMinutes,
    };
  }, [summary, currentDay, dayExercises]);

  const totalSets = useMemo(
    () => (session?.exercises ?? []).reduce((s, ex) => s + ex.sets.length, 0),
    [session]
  );

  const dateLabel = formatShortDate();

  if (loadingSummary || (currentDay && loadingExercises)) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[700]} />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center px-10 bg-ui-background-light dark:bg-ui-background-dark">
        <Text className="font-jakarta-bold text-center text-lg mb-1.5 text-ui-text-main dark:text-ui-text-mainDark">
          No tenés una sesión pendiente
        </Text>
        <Text className="font-manrope text-center text-sm text-ui-text-muted dark:text-ui-text-mutedDark">
          {summary?.isCompleted
            ? "Completaste todo el plan. ¡Buen trabajo!"
            : "Cuando tengas un plan activo, tu próxima sesión va a aparecer acá."}
        </Text>
      </View>
    );
  }

  if (session.exercises.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-10 bg-ui-background-light dark:bg-ui-background-dark">
        <Barbell size={32} color={isDark ? ui.text.mutedDark : ui.text.muted} />
        <Text className="font-jakarta-bold text-center text-lg mt-3.5 text-ui-text-main dark:text-ui-text-mainDark">
          {session.sessionName}
        </Text>
        <Text className="font-manrope text-center text-sm mt-1.5 text-ui-text-muted dark:text-ui-text-mutedDark">
          Esta sesión todavía no tiene ejercicios cargados.
        </Text>
      </View>
    );
  }

  return (
    <Screen safe>
      <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 36,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header editorial ── */}
          <View className="pt-2 mb-7">
            <View className="flex-row items-center gap-1.5 mb-5">
              <View className="w-7 h-[3px] rounded-sm bg-brandSecondary-400" />
              <View className="w-2.5 h-[3px] rounded-sm bg-brandSecondary-700/40 dark:bg-brandSecondary-400/40" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.4px] text-brandSecondary-700 dark:text-brandSecondary-400">
                {hasDraft ? "En curso" : "Sesión de hoy"}
              </Text>
              <Text className="font-jakarta-bold text-[10px] tracking-[2px] text-ui-text-muted dark:text-ui-text-mutedDark">
                {dateLabel}
              </Text>
            </View>

            <View className="self-start mb-3.5 px-2.5 py-1 rounded-[9px] border bg-brandPrimary-700/[8%] dark:bg-brandPrimary-700/[15%] border-brandPrimary-700/25 dark:border-brandPrimary-700/40">
              <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.8px] text-brandPrimary-700">
                {session.planName}
                {session.weekNumber ? ` · Semana ${session.weekNumber}` : ""}
                {` · ${session.dayLabel}`}
              </Text>
            </View>

            <Text
              className="font-jakarta-bold text-[28px] leading-8 tracking-[-0.8px] text-ui-text-main dark:text-ui-text-mainDark"
              numberOfLines={2}
            >
              {session.sessionName}
            </Text>
          </View>

          {/* ── Stats ── */}
          <View className="flex-row gap-2.5 mb-8">
            {[
              { value: `${session.exercises.length}`, label: "ejercicios" },
              { value: `${session.estimatedMinutes}'`, label: "est." },
              { value: `${totalSets}`, label: "series" },
            ].map((stat, i) => (
              <View
                key={i}
                className="flex-1 items-center py-4 rounded-[18px] border bg-ui-surface-light dark:bg-ui-surface-dark border-ui-text-main/8 dark:border-white/8"
              >
                <Text className="font-jakarta-bold text-2xl leading-7 tracking-[-0.6px] text-ui-text-main dark:text-ui-text-mainDark">
                  {stat.value}
                </Text>
                <Text className="font-manrope-bold uppercase mt-1 text-[9px] tracking-[1.4px] text-ui-text-muted dark:text-ui-text-mutedDark">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Lista de ejercicios ── */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-4 h-0.5 rounded-[1px] bg-brandSecondary-400" />
            <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
              Ejercicios
            </Text>
            <View className="flex-1 h-px bg-ui-text-main/[6%] dark:bg-white/[6%]" />
          </View>

          <View className="gap-2.5">
            {session.exercises.map((ex, idx) => (
              <PlanExerciseRow
                key={ex.id}
                exercise={ex}
                position={idx + 1}
                onVideoPress={handleVideoPress}
                onEquipmentPress={handleEquipmentPress}
              />
            ))}
          </View>

          {/* ── CTA: Iniciar sesión ── */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push("/(protected)/sesion-active/active");
            }}
            className="active:opacity-90 mt-7"
          >
            <LinearGradient
              colors={[brandPrimary[700], brandPrimary[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 22,
                paddingVertical: 20,
                paddingHorizontal: 26,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                shadowColor: brandPrimary[700],
                shadowOpacity: 0.55,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              <Text className="font-jakarta-bold text-[17px] tracking-[-0.3px] text-white">
                {hasDraft ? "Continuar sesión" : "Iniciar sesión"}
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
        <EquipmentImageSheet
          sheetRef={equipmentSheetRef}
          imageUri={activeEquipment?.uri}
          name={activeEquipment?.name}
        />
      </View>
    </Screen>
  );
}
