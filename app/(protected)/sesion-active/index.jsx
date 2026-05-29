import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo } from "react";

import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { brandPrimary, brandSecondary, ui } from "../../../src/theme/colors.js";
import { Barbell, ChevronRight } from "../../../assets/icons.jsx";

import { useActivePlanSummary } from "../../../src/hooks/plans/use-active-plan-summary";
import { usePlanDayExercises } from "../../../src/hooks/plans/use-plan-day-exercises";
import { sessionDraftKey } from "../../../src/hooks/sessions/use-session-draft";

import { formatShortDate } from "../../../src/utils/format-date";
import { useColorScheme } from "nativewind";

const BRAND_PRIMARY = brandPrimary[700];
const BRAND_PRIMARY_DEEP = brandPrimary[600];
const BRAND_MINT = brandSecondary[400];

export default function SesionOverview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id);

  // Redirige a activa si hay un draft en curso
  const [draftChecked, setDraftChecked] = useState(false);
  useEffect(() => {
    if (!currentDay?.id) return;
    AsyncStorage.getItem(sessionDraftKey(currentDay.id)).then((raw) => {
      if (raw) {
        router.replace("/(protected)/sesion-active/activa");
      } else {
        setDraftChecked(true);
      }
    });
  }, [currentDay?.id]);

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
      weekNumber: currentDay.week_number,
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

  if (loadingSummary || (currentDay && loadingExercises) || !draftChecked && currentDay) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
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
        <Pressable onPress={() => router.back()} className="mt-6">
          <Text className="font-jakarta-bold text-sm text-brandPrimary-700">
            Volver
          </Text>
        </Pressable>
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
        {/* ── Header editorial ── */}
        <View className="mb-8">
          <View className="flex-row items-center gap-1.5 mb-5">
            <View className="w-7 h-[3px] rounded-sm bg-brandSecondary-400" />
            <View className="w-2.5 h-[3px] rounded-sm bg-brandSecondary-700/40 dark:bg-brandSecondary-400/40" />
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.4px] text-brandSecondary-700 dark:text-brandSecondary-400">
              Sesión de hoy
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View
                className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400"
                style={{
                  shadowColor: BRAND_MINT,
                  shadowOpacity: 1,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Text className="font-jakarta-bold text-[10px] tracking-[2px] text-ui-text-muted dark:text-ui-text-mutedDark">
                {dateLabel}
              </Text>
            </View>
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
            {session.sessionName}.
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

        {/* ── Lista compacta de ejercicios ── */}
        <View className="mb-9">
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-4 h-0.5 rounded-[1px] bg-brandSecondary-400" />
            <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
              Ejercicios
            </Text>
            <View className="flex-1 h-px bg-ui-text-main/[6%] dark:bg-white/[6%]" />
          </View>

          <View className="rounded-2xl border border-ui-text-main/8 dark:border-white/8 bg-ui-surface-light dark:bg-ui-surface-dark overflow-hidden">
            {session.exercises.map((ex, idx) => (
              <View
                key={ex.id}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${
                  idx < session.exercises.length - 1
                    ? "border-b border-ui-text-main/[5%] dark:border-white/[5%]"
                    : ""
                }`}
              >
                <Text className="font-manrope-bold text-[11px] w-5 text-center text-ui-text-muted dark:text-ui-text-mutedDark">
                  {idx + 1}
                </Text>
                <Text
                  className="flex-1 font-jakarta-semi text-[14px] tracking-[-0.2px] text-ui-text-main dark:text-ui-text-mainDark"
                  numberOfLines={1}
                >
                  {ex.exercise_name}
                </Text>
                {ex.exercise_muscle ? (
                  <View className="px-2 py-[3px] rounded-lg bg-brandSecondary-400/[18%] dark:bg-brandSecondary-400/[10%]">
                    <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
                      {ex.exercise_muscle}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA ── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(protected)/sesion-active/ejercicios");
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
              Ver ejercicios
            </Text>
            <View className="w-[38px] h-[38px] rounded-full items-center justify-center bg-white/20">
              <ChevronRight size={17} color="white" />
            </View>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}
