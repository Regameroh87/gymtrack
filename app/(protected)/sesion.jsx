// React Native
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";

// Librerías externas
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { useRouter } from "expo-router";

// Tema / assets
import { brandPrimary, brandSecondary, ui } from "../../src/theme/colors.js";
import {
  Barbell,
  ChevronRight,
  Play,
  X,
  CheckCircle,
} from "../../assets/icons.jsx";

// Hooks
import { useActivePlanSummary } from "../../src/hooks/use-active-plan-summary";
import { usePlanDayExercises } from "../../src/hooks/use-plan-day-exercises";
import { useSaveSessionLog } from "../../src/hooks/use-save-session-log";
import { useSessionDraft } from "../../src/hooks/use-session-draft";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Utils
import { formatShortDate } from "../../src/utils/format-date";
import { getCloudinaryUrl } from "../../src/utils/cloudinary";

// Componentes
import PlanExerciseRow from "../../src/components/cards/plan-exercise-row";
import VideoPlayerSheet from "../../src/components/videos/VideoPlayerSheet";

// Colores JS: solo para gradientes y sombras (no expresables como clase).
const BRAND_PRIMARY = brandPrimary[700];
const BRAND_PRIMARY_DEEP = brandPrimary[600];
const BRAND_MINT = brandSecondary[400];

const formatMMSS = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ─── Helpers de prescripción ────────────────────────────────────────────────

// Texto del objetivo de una serie según el modo del ejercicio.
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

// Peso de referencia del ejercicio: el mayor peso prescrito entre sus series.
function refWeightLabel(exercise) {
  const weights = exercise.sets
    .map((s) => s.weight_kg)
    .filter((w) => w != null);
  return weights.length ? `${Math.max(...weights)} kg` : "Libre";
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function PreviewScreen({ session, onStart }) {
  const insets = useSafeAreaInsets();

  const videoSheetRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const handleVideoPress = ({ url, kind, title }) => {
    setActiveVideo({ url, kind, title });
    videoSheetRef.current?.present();
  };

  const totalSets = useMemo(
    () => session.exercises.reduce((s, ex) => s + ex.sets.length, 0),
    [session.exercises]
  );

  const dateLabel = formatShortDate();

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
          {/* Ticks */}
          <View className="flex-row items-center gap-1.5 mb-5">
            <View className="w-7 h-[3px] rounded-sm bg-brandSecondary-400" />
            <View className="w-2.5 h-[3px] rounded-sm bg-brandSecondary-700/40 dark:bg-brandSecondary-400/40" />
          </View>

          {/* Kicker + date */}
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

          {/* Plan badge */}
          <View className="self-start mb-3.5 px-2.5 py-1 rounded-[9px] border bg-brandPrimary-700/[8%] dark:bg-brandPrimary-700/[15%] border-brandPrimary-700/25 dark:border-brandPrimary-700/40">
            <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.8px] text-brandPrimary-700">
              {session.planName}
              {session.weekNumber ? ` · Semana ${session.weekNumber}` : ""}
              {` · ${session.dayLabel}`}
            </Text>
          </View>

          {/* Session title */}
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

        {/* ── Exercise list ── */}
        <View className="mb-9">
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
              />
            ))}
          </View>
        </View>

        {/* ── CTA ── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onStart();
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

// ─── Active session ──────────────────────────────────────────────────────────

function ActiveSession({ session, summary, currentDay, dayId, onEnd }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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
  } = useSessionDraft(dayId);

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

  // Cuenta regresiva del descanso entre series. Al llegar a 0 vibra y se
  // auto-oculta a los 2s.
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

  const exercise = session.exercises[currentIdx];
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < session.exercises.length - 1;
  const isDuration = (exercise.prescription_mode ?? "reps") === "duration";

  const totalSets = useMemo(
    () => session.exercises.reduce((s, ex) => s + ex.sets.length, 0),
    [session.exercises]
  );
  const doneCount = completedSets.size;

  const timerStr = formatMMSS(elapsed);
  const restLabel = rest ? formatMMSS(rest.left) : null;
  const mutedIcon = isDark ? ui.text.mutedDark : ui.text.muted;

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
    await saveLog({
      summary,
      currentDay,
      session,
      completedSets,
      setData,
      elapsed,
    });
    clearDraft();
    onEnd();
  }

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      {/* ── Top bar (fijo) ── */}
      <View className="flex-row items-center justify-between px-5 pb-3.5">
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

        <View className="flex-row items-center gap-1.5">
          <View
            className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400"
            style={{
              shadowColor: BRAND_MINT,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
            Sesión en curso
          </Text>
        </View>

        <View className="px-[11px] py-[5px] rounded-[10px] border bg-brandPrimary-700/[14%] dark:bg-brandPrimary-700/[15%] border-brandPrimary-700/40 dark:border-brandPrimary-700/40">
          <Text className="font-jakarta-bold text-[13px] tracking-[1px] text-brandPrimary-700">
            {timerStr}
          </Text>
        </View>
      </View>

      {/* ── Progress bar (fijo) ── */}
      <View className="mx-5 h-[3px] rounded-[2px] bg-ui-text-main/[6%] dark:bg-white/[6%]">
        <View
          className="h-[3px] rounded-[2px] bg-brandSecondary-400"
          style={{
            width: `${totalSets > 0 ? (doneCount / totalSets) * 100 : 0}%`,
          }}
        />
      </View>

      {/* ── Exercise strip (fijo) ── */}
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

      {/* ── Cabecera del ejercicio (fija) ── */}
      <View
        className="mx-5 rounded-t-3xl overflow-hidden border-t border-l border-r border-ui-text-main/8 dark:border-white/8"
        style={{
          shadowColor: BRAND_PRIMARY,
          shadowOpacity: 0.12,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={[
            isDark ? "rgba(42,232,204,0.18)" : "rgba(42,232,204,0.11)",
            isDark ? "rgba(74,68,228,0.12)" : "rgba(74,68,228,0.06)",
            "rgba(0,0,0,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20, paddingBottom: 22 }}
        >
          <Text
            className="absolute font-jakarta-bold"
            style={{
              right: 14,
              top: -8,
              fontSize: 108,
              lineHeight: 108,
              color: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,13,32,0.04)",
            }}
          >
            {String(currentIdx + 1).padStart(2, "0")}
          </Text>

          <View className="flex-row items-center justify-between mb-3">
            <View className="px-[9px] py-[3px] rounded-lg bg-brandSecondary-400/[26%] dark:bg-brandSecondary-400/[12%]">
              <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.6px] text-brandSecondary-700 dark:text-brandSecondary-400">
                {exercise.exercise_muscle || "—"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1 px-[9px] py-[3px] rounded-lg border bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10">
              <Barbell size={11} color={mutedIcon} />
              <Text className="font-manrope-bold text-[11px] tracking-[0.4px] text-ui-text-muted dark:text-ui-text-mutedDark">
                {refWeightLabel(exercise)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-end justify-between">
            <Text
              className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark"
              style={{
                flex: 1,
                fontSize: 24,
                lineHeight: 30,
                letterSpacing: -0.7,
              }}
            >
              {exercise.exercise_name}
            </Text>

            {exercise.video_uri && (
              <Pressable
                onPress={() => {
                  setActiveVideo({
                    url:
                      getCloudinaryUrl(exercise.video_uri) ??
                      exercise.video_uri,
                    title: exercise.exercise_name,
                  });
                  videoSheetRef.current?.present();
                }}
                hitSlop={10}
                className="active:opacity-60"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(42,232,204,0.18)"
                    : "rgba(42,232,204,0.22)",
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(42,232,204,0.3)"
                    : "rgba(42,232,204,0.4)",
                  shadowColor: BRAND_MINT,
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Play size={12} color={BRAND_MINT} />
              </Pressable>
            )}
          </View>
        </LinearGradient>

        <View className="mx-5 h-px bg-ui-text-main/[6%] dark:bg-white/[6%]" />
      </View>

      {/* ── Series (scrollables) ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Set rows — parte inferior de la card */}
        <View className="mx-5 mb-4 rounded-b-3xl overflow-hidden border-b border-l border-r border-ui-text-main/8 dark:border-white/8 bg-ui-surface-light dark:bg-ui-surface-dark px-5 pt-5 pb-5 gap-4">
          {exercise.sets.map((set, si) => {
            const key = `${exercise.id}-${set.id}`;
            const done = completedSets.has(key);
            const data = setData[key] ?? {};
            return (
              <View key={set.id} className="gap-2.5">
                {/* Línea 1 · objetivo */}
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`font-manrope-bold uppercase text-[11px] tracking-[1.2px] w-6 ${
                      done
                        ? "text-brandSecondary-700 dark:text-brandSecondary-400"
                        : "text-ui-text-muted dark:text-ui-text-mutedDark"
                    }`}
                  >
                    S{si + 1}
                  </Text>

                  {/* Target chip */}
                  <View
                    className={`px-[9px] py-1 rounded-lg border ${
                      done
                        ? "bg-transparent border-transparent"
                        : "bg-brandSecondary-400/[26%] dark:bg-brandSecondary-400/[12%] border-brandSecondary-700/30 dark:border-brandSecondary-400/20"
                    }`}
                  >
                    <Text
                      className={`font-manrope-bold text-xs ${
                        done
                          ? "text-ui-text-main/[22%] dark:text-white/[22%]"
                          : "text-brandSecondary-700 dark:text-brandSecondary-400"
                      }`}
                    >
                      {setTargetLabel(set, exercise.prescription_mode)}
                    </Text>
                  </View>

                  {/* Intensity chip (RPE) */}
                  {exercise.intensity_mode === "rpe" && set.rpe != null && (
                    <View
                      className={`px-[9px] py-1 rounded-lg border ${
                        done
                          ? "bg-transparent border-transparent"
                          : "bg-brandPrimary-700/[16%] border-brandPrimary-700/30 dark:border-brandPrimary-700/20"
                      }`}
                    >
                      <Text
                        className={`font-manrope-bold text-xs ${
                          done
                            ? "text-ui-text-main/[22%] dark:text-white/[22%]"
                            : "text-brandPrimary-700"
                        }`}
                      >
                        RPE {set.rpe}
                      </Text>
                    </View>
                  )}

                  {/* Intensity chip (RIR) */}
                  {exercise.intensity_mode === "rir" && set.rir != null && (
                    <View
                      className={`px-[9px] py-1 rounded-lg border ${
                        done
                          ? "bg-transparent border-transparent"
                          : "bg-brandPrimary-700/[16%] border-brandPrimary-700/30 dark:border-brandPrimary-700/20"
                      }`}
                    >
                      <Text
                        className={`font-manrope-bold text-xs ${
                          done
                            ? "text-ui-text-main/[22%] dark:text-white/[22%]"
                            : "text-brandPrimary-700"
                        }`}
                      >
                        RIR {set.rir}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Línea 2 · registro */}
                <View className="flex-row items-center gap-2 ml-8">
                  {!isDuration && (
                    <>
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
                        placeholderTextColor={
                          isDark
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(15,13,32,0.22)"
                        }
                        className={`w-[44px] px-2 py-[7px] rounded-[10px] border font-jakarta-semi text-[14px] text-center ${
                          done
                            ? "bg-transparent border-transparent text-ui-text-main/[22%] dark:text-white/[22%]"
                            : "bg-ui-input-light dark:bg-ui-input-dark border-ui-text-main/[22%] dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
                        }`}
                      />
                      <Text className="font-manrope text-xs text-ui-text-muted dark:text-ui-text-mutedDark">
                        reps
                      </Text>
                    </>
                  )}

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
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.2)" : "rgba(15,13,32,0.22)"
                    }
                    className={`w-[56px] px-2.5 py-[7px] rounded-[10px] border font-jakarta-semi text-[15px] text-center ${
                      done
                        ? "bg-transparent border-transparent text-ui-text-main/[22%] dark:text-white/[22%]"
                        : "bg-ui-input-light dark:bg-ui-input-dark border-ui-text-main/[22%] dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
                    }`}
                  />
                  <Text className="font-manrope text-xs text-ui-text-muted dark:text-ui-text-mutedDark">
                    kg
                  </Text>

                  <View className="flex-1" />

                  <Pressable
                    onPress={() => toggleSet(exercise.id, set.id)}
                    hitSlop={10}
                    className={`w-[34px] h-[34px] rounded-[17px] items-center justify-center border-[1.5px] active:opacity-70 ${
                      done
                        ? "bg-brandSecondary-400 border-brandSecondary-400"
                        : "bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/[30%] dark:border-white/15"
                    }`}
                    style={
                      done
                        ? {
                            shadowColor: BRAND_MINT,
                            shadowOpacity: 0.65,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 2 },
                          }
                        : undefined
                    }
                  >
                    {done && (
                      <CheckCircle
                        size={18}
                        color={isDark ? "#0f0d20" : "#ffffff"}
                      />
                    )}
                  </Pressable>
                </View>

                {/* Nota de la serie */}
                <TextInput
                  value={data.notes ?? ""}
                  onChangeText={(v) =>
                    updateField(exercise.id, set.id, "notes", v)
                  }
                  placeholder="Nota de la serie..."
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.18)" : "rgba(15,13,32,0.2)"
                  }
                  className="ml-8 px-3 py-1.5 rounded-[9px] border font-manrope text-xs bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
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
          {/* ← Anterior */}
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

          {/* → Siguiente / Finalizar */}
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
                shadowColor: BRAND_PRIMARY,
                shadowOpacity: isSaving ? 0.25 : 0.5,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
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
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View
            className="mx-4 mb-8 rounded-3xl border border-ui-text-main/8 dark:border-white/10 bg-ui-surface-light dark:bg-ui-surface-dark p-5"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: -4 },
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  clearDraft();
                  setShowExitConfirm(false);
                  onEnd();
                }}
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
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 16,
                  }}
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
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View
            className="mx-4 mb-8 rounded-3xl border border-ui-text-main/8 dark:border-white/10 bg-ui-surface-light dark:bg-ui-surface-dark p-5"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: -4 },
              elevation: 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-1">
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
  );
}

// ─── Estado vacío / carga ──────────────────────────────────────────────────────

function StatusScreen({ children }) {
  return (
    <View className="flex-1 items-center justify-center px-10 bg-ui-background-light dark:bg-ui-background-dark">
      {children}
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const phaseKey = (dayId) => `gymtrack:session_phase:${dayId}`;

export default function Sesion() {
  const [phase, setPhase] = useState("preview");
  const [isPhaseRestored, setIsPhaseRestored] = useState(false);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id);

  useEffect(() => {
    if (!currentDay?.id) return;
    AsyncStorage.getItem(phaseKey(currentDay.id)).then((saved) => {
      if (saved === "active") setPhase("active");
      setIsPhaseRestored(true);
    });
  }, [currentDay?.id]);

  useEffect(() => {
    if (!currentDay?.id || !isPhaseRestored) return;
    AsyncStorage.setItem(phaseKey(currentDay.id), phase);
  }, [phase, currentDay?.id, isPhaseRestored]);

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

  if (loadingSummary || (currentDay && loadingExercises)) {
    return (
      <StatusScreen>
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </StatusScreen>
    );
  }

  if (!session) {
    return (
      <StatusScreen>
        <Text className="font-jakarta-bold text-center text-lg mb-1.5 text-ui-text-main dark:text-ui-text-mainDark">
          No tenés una sesión pendiente
        </Text>
        <Text className="font-manrope text-center text-sm text-ui-text-muted dark:text-ui-text-mutedDark">
          {summary?.isCompleted
            ? "Completaste todo el plan. ¡Buen trabajo!"
            : "Cuando tengas un plan activo, tu próxima sesión va a aparecer acá."}
        </Text>
      </StatusScreen>
    );
  }

  if (session.exercises.length === 0) {
    return (
      <StatusScreen>
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
      </StatusScreen>
    );
  }

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      {phase === "preview" ? (
        <PreviewScreen session={session} onStart={() => setPhase("active")} />
      ) : (
        <ActiveSession
          session={session}
          summary={summary}
          currentDay={currentDay}
          dayId={currentDay?.id}
          onEnd={() => setPhase("preview")}
        />
      )}
    </View>
  );
}
