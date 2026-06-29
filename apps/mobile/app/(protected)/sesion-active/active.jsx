import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import Screen from "../../../src/components/Screen.jsx";

import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { useRouter, Stack } from "expo-router";

import {
  brandPrimary,
  brandSecondary,
  ui,
  gradient,
} from "@gymtrack/core/colors";
import { HeaderBackButton } from "@react-navigation/elements";

import {
  Barbell,
  ChevronRight,
  Play,
  X,
  CheckCircle,
} from "../../../assets/icons.jsx";

import { useActivePlanSummary } from "../../../src/hooks/plans/use-active-plan-summary.js";
import { usePlanDayExercises } from "../../../src/hooks/plans/use-plan-day-exercises.js";
import { useSaveSessionLog } from "../../../src/hooks/sessions/use-save-session-log.js";
import { useSessionDraft } from "@gymtrack/core/hooks/sessions/use-session-draft";

import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { makeShadow } from "../../../src/utils/box-shadow.js";

import VideoPlayerSheet from "../../../src/components/videos/VideoPlayerSheet.jsx";

const BRAND_PRIMARY = brandPrimary[700];
const BRAND_PRIMARY_DEEP = brandPrimary[600];
const BRAND_MINT = brandSecondary[400];

const formatMMSS = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function setTargetLabel(set, mode) {
  if ((mode ?? "reps") === "duration") {
    return set.duration_seconds != null ? `${set.duration_seconds}s` : "—";
  }
  const lo = set.reps_min;
  const hi = set.reps_max;
  if (lo != null && hi != null) {
    return lo === hi ? `${lo} reps` : `${lo}–${hi} reps`;
  }
  if (lo != null || hi != null) return `${lo ?? hi} reps`;
  return "— reps";
}

function refWeightLabel(exercise) {
  const weights = exercise.sets
    .map((s) => s.weight_kg)
    .filter((w) => w != null);
  return weights.length ? `${Math.max(...weights)} kg` : "Libre";
}

export default function SesionActiva() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedIcon = isDark ? ui.text.mutedDark : ui.text.muted;

  // ── Colores crudos desde el theme (no expresables como clase Tailwind) ──
  const placeholderColor = isDark ? ui.placeholder.dark : ui.placeholder.light;
  const checkOnMint = isDark ? ui.text.main : ui.surface.light;
  const onPrimary = ui.surface.light; // blanco para íconos sobre el degradado
  const ghostNumberColor = isDark
    ? ui.decor.ghostNumber.dark
    : ui.decor.ghostNumber.light;
  const mintHaloColors = isDark
    ? gradient.mintHalo.dark
    : gradient.mintHalo.light;
  const primaryHaloColors = isDark
    ? gradient.primaryHalo.dark
    : gradient.primaryHalo.light;
  const placeholderGradientColors = isDark
    ? gradient.sessionPlaceholder.dark
    : gradient.sessionPlaceholder.light;

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id, summary?.isCustom);

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

  const {
    startedAt,
    currentIdx,
    setCurrentIdx,
    completedSets,
    setCompletedSets,
    setData,
    updateField,
    clearDraft,
    isRestored,
  } = useSessionDraft(currentDay?.id);

  const videoSheetRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const { mutateAsync: saveLog, isPending: isSaving } = useSaveSessionLog();

  useEffect(() => {
    if (!isRestored || !startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRestored, startedAt]);

  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const hide = setTimeout(() => setRest(null), 2000);
      return () => clearTimeout(hide);
    }
    const tick = setTimeout(
      () => setRest((r) => (r ? { ...r, left: r.left - 1 } : r)),
      1000
    );
    return () => clearTimeout(tick);
  }, [rest]);

  // Si el índice restaurado del draft quedó fuera de rango (p. ej. el día
  // cambió tras un sync y ahora tiene menos ejercicios), lo reajustamos al
  // último ejercicio válido. Sin esto, session.exercises[currentIdx] sería
  // undefined y el render crashea al leer prescription_mode.
  useEffect(() => {
    if (!session) return;
    const lastIdx = session.exercises.length - 1;
    if (lastIdx >= 0 && currentIdx > lastIdx) {
      setCurrentIdx(lastIdx);
    }
  }, [session, currentIdx, setCurrentIdx]);

  const isLoading = loadingSummary || (currentDay && loadingExercises);

  if (isLoading || !session) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  // Día sin ejercicios: estado vacío explícito en lugar de crashear.
  if (session.exercises.length === 0) {
    return (
      <Screen safe={Platform.OS !== "ios"}>
        <Stack.Screen
          options={{
            headerShown: Platform.OS === "ios",
            headerShadowVisible: false,
            headerTitle: "",
            headerStyle: {
              backgroundColor: isDark
                ? ui.background.dark
                : ui.background.light,
            },
            headerLeft: () => (
              <HeaderBackButton
                onPress={() => router.back()}
                tintColor={mutedIcon}
              />
            ),
          }}
        />
        <View className="flex-1 items-center justify-center px-8 bg-ui-background-light dark:bg-ui-background-dark">
          <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-ui-text-main/[5%] dark:bg-white/[6%]">
            <Barbell size={28} color={mutedIcon} />
          </View>
          <Text className="font-jakarta-bold text-[20px] tracking-[-0.5px] text-center text-ui-text-main dark:text-ui-text-mainDark mb-2">
            Este día no tiene ejercicios
          </Text>
          <Text className="font-manrope text-sm text-center leading-5 text-ui-text-muted dark:text-ui-text-mutedDark mb-6">
            Todavía no hay ejercicios cargados para esta sesión.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="rounded-2xl py-3.5 px-7 items-center bg-ui-text-main/[6%] dark:bg-white/[7%] active:opacity-70"
          >
            <Text className="font-jakarta-bold text-[15px] tracking-[-0.2px] text-ui-text-main dark:text-ui-text-mainDark">
              Volver
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const exercise = session.exercises[currentIdx];

  // Frame transitorio: el índice quedó fuera de rango y el efecto de clamp
  // todavía no corrió. Mostramos el spinner hasta que se reajuste.
  if (!exercise) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  const canPrev = currentIdx > 0;
  const canNext = currentIdx < session.exercises.length - 1;
  const isDuration = (exercise.prescription_mode ?? "reps") === "duration";
  const coverUrl = exercise.image_uri
    ? (getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri)
    : null;

  const totalSets = session.exercises.reduce((s, ex) => s + ex.sets.length, 0);
  const doneCount = completedSets.size;

  const timerStr = formatMMSS(elapsed);
  const restLabel = rest ? formatMMSS(rest.left) : null;

  function toggleSet(exId, setId) {
    const key = `${exId}-${setId}`;
    const wasDone = completedSets.has(key);
    setCompletedSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (!wasDone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (exercise.rest_seconds) {
        setRest({ total: exercise.rest_seconds, left: exercise.rest_seconds });
      }
    }
  }

  function addRestTime(delta) {
    setRest((r) => (r ? { ...r, left: Math.max(0, r.left + delta) } : r));
  }

  function skipRest() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRest(null);
  }

  async function handleFinish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await saveLog({
        summary,
        currentDay,
        session,
        completedSets,
        setData,
        elapsed,
      });
      await clearDraft();
      router.replace("/(protected)/registros");
    } catch {
      Alert.alert(
        "No se pudo guardar",
        "Hubo un error al guardar tu sesión. Revisá tu conexión e intentá de nuevo."
      );
    }
  }

  async function handleAbandon() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await clearDraft();
    setShowExitConfirm(false);
    router.replace("/(protected)/(tabs)/(home)");
  }

  return (
    <Screen safe={Platform.OS !== "ios"}>
      <Stack.Screen
        options={{
          headerShown: Platform.OS === "ios",
          headerShadowVisible: false,
          headerTitle: "",
          headerStyle: {
            backgroundColor: isDark ? ui.background.dark : ui.background.light,
          },
          headerLeft: () => (
            <HeaderBackButton
              onPress={() => router.back()}
              tintColor={mutedIcon}
            />
          ),
        }}
      />
      <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
        {/* ── Top bar ── */}
        <View className="flex-row items-center justify-between px-5 pb-3">
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowExitConfirm(true);
              }}
              hitSlop={12}
              className="w-9 h-9 rounded-full items-center justify-center border bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10 active:opacity-60"
            >
              <X size={16} color={mutedIcon} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: BRAND_MINT,
                ...makeShadow({ color: BRAND_MINT, opacity: 0.9, radius: 6 }),
              }}
            />
            <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
              Sesión en curso
            </Text>
          </View>

          <View className="px-[11px] py-[5px] rounded-[10px] border bg-brandPrimary-700/[14%] dark:bg-brandPrimary-700/[15%] border-brandPrimary-700/40">
            <Text className="font-jakarta-bold text-[13px] tracking-[1px] text-brandPrimary-700">
              {timerStr}
            </Text>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View className="mx-5 h-[3px] rounded-[2px] bg-ui-text-main/[6%] dark:bg-white/[6%]">
          <View
            className="h-[3px] rounded-[2px] bg-brandSecondary-400"
            style={{
              width: `${totalSets > 0 ? (doneCount / totalSets) * 100 : 0}%`,
            }}
          />
        </View>

        {/* ── Exercise strip ── */}
        <View style={{ height: 60 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              alignItems: "center",
              gap: 6,
            }}
          >
            {session.exercises.map((ex, i) => {
              const isActive = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrentIdx(i);
                  }}
                  className="active:opacity-70"
                >
                  <View
                    className={`px-3 py-1.5 rounded-xl border ${
                      isActive
                        ? "bg-brandPrimary-700 border-transparent"
                        : isPast
                          ? "bg-transparent border-brandSecondary-400/30"
                          : "bg-transparent border-ui-text-main/[20%] dark:border-white/[8%]"
                    }`}
                  >
                    <Text
                      className={`font-manrope-bold text-[11px] ${
                        isActive
                          ? "text-white"
                          : isPast
                            ? "text-brandSecondary-700 dark:text-brandSecondary-400"
                            : "text-ui-text-muted dark:text-ui-text-mutedDark"
                      }`}
                      numberOfLines={1}
                    >
                      {i + 1}. {ex.exercise_name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Cabecera del ejercicio (lenguaje de la card de la home) ── */}
        <View
          className="mx-5 mb-3 rounded-3xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-ui-text-main/8 dark:border-white/8"
          style={{
            ...makeShadow({ color: BRAND_PRIMARY, opacity: 0.18, radius: 24, offset: { width: 0, height: 10 } }),
            elevation: 10,
          }}
        >
          {/* Halos de fondo */}
          <LinearGradient
            colors={mintHaloColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.8 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 200,
              height: 200,
            }}
          />
          <LinearGradient
            colors={primaryHaloColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 240,
              height: 170,
            }}
          />

          {/* Número editorial gigante (textura, 4-5%) */}
          <Text
            className="absolute font-jakarta-bold"
            style={{
              top: -28,
              right: -8,
              fontSize: 150,
              lineHeight: 150,
              letterSpacing: -6,
              color: ghostNumberColor,
            }}
          >
            {String(currentIdx + 1).padStart(2, "0")}
          </Text>

          {/* Ticks decorativos */}
          <View className="absolute top-[15px] left-5 w-7 h-[3px] rounded-sm bg-brandSecondary-400" />
          <View className="absolute top-[15px] left-[52px] w-2.5 h-[3px] rounded-sm bg-brandSecondary-700/50 dark:bg-brandSecondary-400/40" />

          {/* Header: músculo · índice */}
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: 20, paddingTop: 26 }}
          >
            <View className="flex-row items-center gap-2">
              <View className="px-[9px] py-[4px] rounded-lg bg-brandSecondary-400/[26%] dark:bg-brandSecondary-400/[12%]">
                <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.6px] text-brandSecondary-700 dark:text-brandSecondary-400">
                  {exercise.exercise_muscle || "—"}
                </Text>
              </View>
              {!!exercise.is_unilateral && (
                <View className="px-[9px] py-[4px] rounded-lg bg-brandPrimary-700/[14%] dark:bg-brandPrimary-700/[15%]">
                  <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.6px] text-brandPrimary-700">
                    Unilateral · L / R
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-1.5">
              <View
                className="w-2 h-2 rounded-full bg-brandSecondary-400"
                style={{
                  ...makeShadow({ color: BRAND_MINT, opacity: 0.9, radius: 5 }),
                }}
              />
              <Text className="font-jakarta-bold text-xs tracking-[2px] text-brandSecondary-700 dark:text-brandSecondary-400">
                {String(currentIdx + 1).padStart(2, "0")} /{" "}
                {String(session.exercises.length).padStart(2, "0")}
              </Text>
            </View>
          </View>

          {/* Body: título + visual enmarcado */}
          <View
            className="flex-row"
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 16,
              gap: 16,
            }}
          >
            <View className="flex-1 justify-center gap-2">
              <Text
                className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark tracking-tight"
                numberOfLines={3}
                style={{ fontSize: 26, lineHeight: 31 }}
              >
                {exercise.exercise_name}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Barbell size={12} color={mutedIcon} />
                <Text className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-[13px]">
                  {exercise.sets.length}{" "}
                  {exercise.sets.length === 1 ? "serie" : "series"} ·{" "}
                  {refWeightLabel(exercise)}
                </Text>
              </View>
            </View>

            <Pressable
              disabled={!exercise.video_uri}
              onPress={() => {
                setActiveVideo({
                  url:
                    getCloudinaryUrl(exercise.video_uri) ?? exercise.video_uri,
                  title: exercise.exercise_name,
                });
                videoSheetRef.current?.present();
              }}
              className="active:opacity-90"
            >
              <LinearGradient
                colors={[BRAND_MINT, BRAND_PRIMARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 84, height: 84, borderRadius: 18, padding: 2 }}
              >
                <View className="flex-1 bg-brandPrimary-50 dark:bg-ui-surface-dim items-center justify-center rounded-[16px] overflow-hidden">
                  {coverUrl ? (
                    <Image
                      source={{ uri: coverUrl }}
                      contentFit="cover"
                      transition={180}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <>
                      <LinearGradient
                        colors={placeholderGradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                      />
                      <Barbell
                        size={40}
                        color={isDark ? ui.icon.onDark : ui.icon.onLight}
                      />
                    </>
                  )}

                  {exercise.video_uri && (
                    <View className="absolute inset-0 items-center justify-center">
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center bg-brandPrimary-700/90"
                        style={{
                          ...makeShadow({ color: BRAND_PRIMARY, opacity: 0.5, radius: 8, offset: { width: 0, height: 2 } }),
                        }}
                      >
                        <Play size={14} color={onPrimary} />
                      </View>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ── Series (scrollables) ── */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-5 mb-4 gap-3">
            {exercise.sets.map((set, si) => {
              const key = `${exercise.id}-${set.id}`;
              const done = completedSets.has(key);
              const data = setData[key] ?? {};
              const intensityLabel =
                exercise.intensity_mode === "rpe" && set.rpe != null
                  ? `RPE ${set.rpe}`
                  : exercise.intensity_mode === "rir" && set.rir != null
                    ? `RIR ${set.rir}`
                    : null;
              return (
                <View
                  key={set.id}
                  className={`rounded-2xl border p-3.5 ${
                    done
                      ? "bg-brandSecondary-400/[8%] border-brandSecondary-400/30"
                      : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-text-main/8 dark:border-white/8"
                  }`}
                >
                  {/* Fila 1 · identidad de la serie */}
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-9 h-9 rounded-xl items-center justify-center border ${
                        done
                          ? "bg-brandSecondary-400 border-brandSecondary-400"
                          : "bg-brandSecondary-400/[10%] dark:bg-brandSecondary-400/[12%] border-brandSecondary-700/20 dark:border-brandSecondary-400/20"
                      }`}
                      style={
                        done
                          ? {
                              ...makeShadow({ color: BRAND_MINT, opacity: 0.5, radius: 9, offset: { width: 0, height: 2 } }),
                            }
                          : undefined
                      }
                    >
                      <Text
                        className={`font-jakarta-bold text-[15px] ${
                          done
                            ? ""
                            : "text-brandSecondary-700 dark:text-brandSecondary-400"
                        }`}
                        style={done ? { color: checkOnMint } : undefined}
                      >
                        {si + 1}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="font-manrope-bold uppercase text-[10px] tracking-[1.6px] text-ui-text-muted dark:text-ui-text-mutedDark mb-0.5">
                        Serie {si + 1}
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-jakarta-bold text-[14px] tracking-[-0.2px] text-ui-text-main dark:text-ui-text-mainDark">
                          {setTargetLabel(set, exercise.prescription_mode)}
                        </Text>
                        {intensityLabel && (
                          <>
                            <Text className="font-manrope text-[12px] text-ui-text-muted dark:text-ui-text-mutedDark">
                              ·
                            </Text>
                            <Text className="font-manrope-bold text-[12px] text-brandPrimary-700">
                              {intensityLabel}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>

                    <Pressable
                      onPress={() => toggleSet(exercise.id, set.id)}
                      hitSlop={10}
                      className={`w-9 h-9 rounded-full items-center justify-center border-[1.5px] active:opacity-70 ${
                        done
                          ? "bg-brandSecondary-400 border-brandSecondary-400"
                          : "bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/[30%] dark:border-white/15"
                      }`}
                      style={
                        done
                          ? {
                              ...makeShadow({ color: BRAND_MINT, opacity: 0.65, radius: 10, offset: { width: 0, height: 2 } }),
                            }
                          : undefined
                      }
                    >
                      {done && <CheckCircle size={19} color={checkOnMint} />}
                    </Pressable>
                  </View>

                  <View className="h-px my-3 bg-ui-text-main/[6%] dark:bg-white/[6%]" />

                  {/* Fila 2 · registro */}
                  <View className="flex-row items-end gap-3">
                    <View className="flex-1">
                      <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.4px] text-ui-text-muted dark:text-ui-text-mutedDark mb-1.5">
                        Peso (kg)
                      </Text>
                      <TextInput
                        value={data.weight ?? ""}
                        onChangeText={(v) =>
                          updateField(exercise.id, set.id, "weight", v)
                        }
                        keyboardType="decimal-pad"
                        editable={!done}
                        selectTextOnFocus
                        placeholder={
                          set.weight_kg != null ? String(set.weight_kg) : "—"
                        }
                        placeholderTextColor={placeholderColor}
                        className={`px-3 py-2.5 rounded-xl border font-jakarta-semi text-[16px] text-center ${
                          done
                            ? "bg-transparent border-ui-text-main/8 dark:border-white/8 text-ui-text-main/[35%] dark:text-white/[35%]"
                            : "bg-ui-input-light dark:bg-ui-input-dark border-ui-text-main/[14%] dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
                        }`}
                      />
                    </View>

                    {!isDuration && (
                      <View className="flex-1">
                        <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.4px] text-ui-text-muted dark:text-ui-text-mutedDark mb-1.5">
                          Reps
                        </Text>
                        <TextInput
                          value={data.reps ?? ""}
                          onChangeText={(v) =>
                            updateField(exercise.id, set.id, "reps", v)
                          }
                          keyboardType="number-pad"
                          editable={!done}
                          selectTextOnFocus
                          placeholder={
                            set.reps_max != null
                              ? String(set.reps_max)
                              : set.reps_min != null
                                ? String(set.reps_min)
                                : "—"
                          }
                          placeholderTextColor={placeholderColor}
                          className={`px-3 py-2.5 rounded-xl border font-jakarta-semi text-[16px] text-center ${
                            done
                              ? "bg-transparent border-ui-text-main/8 dark:border-white/8 text-ui-text-main/[35%] dark:text-white/[35%]"
                              : "bg-ui-input-light dark:bg-ui-input-dark border-ui-text-main/[14%] dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
                          }`}
                        />
                      </View>
                    )}
                  </View>

                  {/* Fila 3 · nota */}
                  <TextInput
                    value={data.notes ?? ""}
                    onChangeText={(v) =>
                      updateField(exercise.id, set.id, "notes", v)
                    }
                    placeholder="+ Nota de la serie"
                    placeholderTextColor={placeholderColor}
                    className="mt-2.5 px-3 py-2 rounded-xl border font-manrope text-xs bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/8 dark:border-white/8 text-ui-text-main dark:text-ui-text-mainDark"
                  />
                </View>
              );
            })}
          </View>

          {/* ── Series counter ── */}
          <View className="flex-row items-center justify-center gap-2 mb-5">
            <View className="w-1 h-1 rounded-[2px] bg-brandSecondary-400" />
            <Text className="font-manrope-bold uppercase text-[11px] tracking-[1.6px] text-ui-text-muted dark:text-ui-text-mutedDark">
              {doneCount} / {totalSets} series completadas
            </Text>
          </View>

          {/* ── Navegación ── */}
          <View className="flex-row items-center gap-3 px-5 pt-3.5">
            <Pressable
              onPress={() => {
                if (!canPrev) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentIdx((i) => i - 1);
              }}
              disabled={!canPrev}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: !canPrev ? 0.32 : pressed ? 0.6 : 1,
              })}
            >
              <View className="w-14 h-14 rounded-[20px] border items-center justify-center bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10">
                <ChevronRight
                  size={18}
                  color={mutedIcon}
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (canNext) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCurrentIdx((i) => i + 1);
                } else {
                  handleFinish();
                }
              }}
              disabled={isSaving}
              className="flex-1 active:opacity-90"
            >
              <LinearGradient
                colors={[BRAND_PRIMARY, BRAND_PRIMARY_DEEP]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 56,
                  borderRadius: 20,
                  paddingHorizontal: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  ...makeShadow({ color: BRAND_PRIMARY, opacity: isSaving ? 0.25 : 0.5, radius: 18, offset: { width: 0, height: 8 } }),
                  elevation: 10,
                }}
              >
                {canNext ? (
                  <View className="flex-1 mr-3">
                    <Text className="font-manrope-bold uppercase text-[8px] tracking-[2px] text-white/60 mb-0.5">
                      Siguiente
                    </Text>
                    <Text
                      className="font-jakarta-bold text-white text-[15px] tracking-[-0.3px]"
                      numberOfLines={1}
                    >
                      {session.exercises[currentIdx + 1].exercise_name}
                    </Text>
                  </View>
                ) : (
                  <Text className="flex-1 mr-3 font-jakarta-bold text-white text-base tracking-[-0.3px]">
                    {isSaving ? "Guardando..." : "Finalizar sesión"}
                  </Text>
                )}
                <View className="w-9 h-9 rounded-full items-center justify-center bg-white/20">
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : canNext ? (
                    <ChevronRight size={16} color="white" />
                  ) : (
                    <CheckCircle size={16} color="white" />
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>

        <VideoPlayerSheet
          sheetRef={videoSheetRef}
          videoUrl={activeVideo?.url}
          title={activeVideo?.title}
        />

        {/* ── Modal confirmación cierre ── */}
        <Modal
          visible={showExitConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExitConfirm(false)}
        >
          <View
            className="flex-1 justify-end"
            style={{ backgroundColor: ui.overlay.scrim }}
          >
            <View
              className="mx-4 mb-8 rounded-3xl border border-ui-text-main/8 dark:border-white/10 bg-ui-surface-light dark:bg-ui-surface-dark p-5"
              style={{
                ...makeShadow({ color: ui.overlay.shadow, opacity: 0.3, radius: 24, offset: { width: 0, height: -4 } }),
                elevation: 20,
              }}
            >
              <View className="items-center mb-5 mt-1">
                <View className="w-12 h-12 rounded-full items-center justify-center mb-3.5 bg-ui-text-main/[5%] dark:bg-white/[6%]">
                  <X size={20} color={mutedIcon} />
                </View>
                <Text className="font-jakarta-bold text-[20px] tracking-[-0.5px] text-ui-text-main dark:text-ui-text-mainDark mb-1.5">
                  ¿Abandonar sesión?
                </Text>
                <Text className="font-manrope text-sm text-center leading-5 text-ui-text-muted dark:text-ui-text-mutedDark">
                  Perderás los datos ya ingresados en esta sesión.
                </Text>
              </View>

              <View className="gap-2.5">
                <Pressable
                  onPress={handleAbandon}
                  className="rounded-2xl py-4 items-center bg-ui-text-main/[6%] dark:bg-white/[7%] active:opacity-70"
                >
                  <Text className="font-jakarta-bold text-[15px] tracking-[-0.2px] text-ui-text-main dark:text-ui-text-mainDark">
                    Sí, abandonar
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowExitConfirm(false)}
                  className="rounded-2xl py-4 items-center active:opacity-70"
                >
                  <LinearGradient
                    colors={[BRAND_PRIMARY, BRAND_PRIMARY_DEEP]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", inset: 0, borderRadius: 16 }}
                  />
                  <Text className="font-jakarta-bold text-[15px] tracking-[-0.2px] text-white">
                    Continuar sesión
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Modal de descanso ── */}
        <Modal
          visible={!!rest}
          transparent
          animationType="fade"
          onRequestClose={skipRest}
        >
          <View
            className="flex-1 justify-end"
            style={{ backgroundColor: ui.overlay.scrim }}
          >
            <View
              className="mx-4 mb-8 rounded-3xl border border-ui-text-main/8 dark:border-white/10 bg-ui-surface-light dark:bg-ui-surface-dark p-5"
              style={{
                ...makeShadow({ color: ui.overlay.shadow, opacity: 0.3, radius: 24, offset: { width: 0, height: -4 } }),
                elevation: 20,
              }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400"
                    style={{
                      ...makeShadow({ color: BRAND_MINT, opacity: 1, radius: 6 }),
                    }}
                  />
                  <Text className="font-manrope-bold uppercase text-[10px] tracking-[2px] text-brandSecondary-700 dark:text-brandSecondary-400">
                    {rest && rest.left > 0 ? "Descanso" : "¡A entrenar!"}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  {rest && rest.left > 0 && (
                    <Pressable
                      onPress={() => addRestTime(15)}
                      hitSlop={8}
                      className="px-2.5 py-1 rounded-lg border border-brandSecondary-700/20 dark:border-brandSecondary-400/25 active:opacity-60"
                    >
                      <Text className="font-manrope-bold text-[11px] text-brandSecondary-700 dark:text-brandSecondary-400">
                        +15s
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={skipRest}
                    hitSlop={8}
                    className="px-2.5 py-1 rounded-lg bg-ui-text-main/[4%] dark:bg-white/[6%] active:opacity-60"
                  >
                    <Text className="font-manrope-bold text-[11px] text-ui-text-muted dark:text-ui-text-mutedDark">
                      {rest && rest.left > 0 ? "Saltar" : "Cerrar"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text className="font-jakarta-bold text-[52px] leading-[60px] tracking-[-2px] text-ui-text-main dark:text-ui-text-mainDark">
                {restLabel}
              </Text>

              <View className="h-[3px] rounded-[2px] mt-3 bg-ui-text-main/[8%] dark:bg-white/[8%]">
                <View
                  className="h-[3px] rounded-[2px] bg-brandSecondary-400"
                  style={{
                    width: `${rest && rest.total > 0 ? Math.min(100, (rest.left / rest.total) * 100) : 0}%`,
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
