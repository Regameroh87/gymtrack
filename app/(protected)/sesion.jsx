// React Native
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
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

// Utils
import { formatShortDate } from "../../src/utils/format-date";

// Componentes
import PlanExerciseRow from "../../src/components/cards/plan-exercise-row";
import VideoPlayerSheet from "../../src/components/videos/VideoPlayerSheet";

// Colores JS: solo para gradientes y sombras (no expresables como clase).
const BRAND_PRIMARY = brandPrimary[700];
const BRAND_PRIMARY_DEEP = brandPrimary[600];
const BRAND_MINT = brandSecondary[400];

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
          paddingTop: insets.top + 22,
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
              {session.planName} · {session.dayLabel}
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

function ActiveSession({ session, onEnd }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [elapsed, setElapsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(new Set());
  const [setData, setSetData] = useState({});
  const [setNotes, setSetNotes] = useState({});

  function updateWeight(exId, setId, value) {
    const key = `${exId}-${setId}`;
    setSetData((prev) => ({ ...prev, [key]: { weight: value } }));
  }

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const exercise = session.exercises[currentIdx];
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < session.exercises.length - 1;

  const totalSets = useMemo(
    () => session.exercises.reduce((s, ex) => s + ex.sets.length, 0),
    [session.exercises]
  );
  const doneCount = completedSets.size;

  const timerStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  // Color de íconos según el tema (RN no acepta clase Tailwind en color).
  const mutedIcon = isDark ? ui.text.mutedDark : ui.text.muted;

  function toggleSet(exId, setId) {
    const key = `${exId}-${setId}`;
    setCompletedSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      return next;
    });
  }

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      {/* ── Top bar ── */}
      <View
        className="flex-row items-center justify-between px-5 pb-3.5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onEnd();
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

        <View className="px-[11px] py-[5px] rounded-[10px] border bg-brandPrimary-700/[8%] dark:bg-brandPrimary-700/[15%] border-brandPrimary-700/25 dark:border-brandPrimary-700/40">
          <Text className="font-jakarta-bold text-[13px] tracking-[1px] text-brandPrimary-700">
            {timerStr}
          </Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View className="mx-5 h-0.5 rounded-[1px] bg-ui-text-main/[6%] dark:bg-white/[6%]">
        <View
          className="h-0.5 rounded-[1px] bg-brandSecondary-400"
          style={{
            width: `${totalSets > 0 ? (doneCount / totalSets) * 100 : 0}%`,
          }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 28,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Exercise progress dots ── */}
        <View className="flex-row items-center gap-2.5 mb-5">
          <Text className="font-manrope-bold uppercase text-[10px] tracking-[2.2px] text-brandSecondary-700 dark:text-brandSecondary-400">
            Ejercicio {currentIdx + 1} de {session.exercises.length}
          </Text>
          <View className="flex-row gap-1">
            {session.exercises.map((_, i) => (
              <View
                key={i}
                className={`h-1 rounded-[2px] ${
                  i === currentIdx
                    ? "bg-brandPrimary-700"
                    : i < currentIdx
                      ? "bg-brandSecondary-400"
                      : "bg-ui-text-main/[6%] dark:bg-white/[6%]"
                }`}
                style={{ width: i === currentIdx ? 18 : 6 }}
              />
            ))}
          </View>
        </View>

        {/* ── Exercise card ── */}
        <View
          className="rounded-3xl overflow-hidden mb-3.5 border bg-ui-surface-light dark:bg-ui-surface-dark border-ui-text-main/8 dark:border-white/8"
          style={{
            shadowColor: BRAND_PRIMARY,
            shadowOpacity: 0.12,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          {/* Mint halo */}
          <LinearGradient
            colors={[
              isDark ? "rgba(42,232,204,0.14)" : "rgba(42,232,204,0.09)",
              "rgba(42,232,204,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.65, y: 0.85 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 200,
              height: 160,
            }}
          />

          {/* Card header */}
          <View className="p-5 pb-4">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="px-[9px] py-[3px] rounded-lg bg-brandSecondary-400/[14%] dark:bg-brandSecondary-400/[12%]">
                <Text className="font-manrope-bold uppercase text-[9px] tracking-[1.6px] text-brandSecondary-700 dark:text-brandSecondary-400">
                  {exercise.exercise_muscle}
                </Text>
              </View>

              <View className="flex-row items-center gap-1 px-[9px] py-[3px] rounded-lg border bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10">
                <Barbell size={11} color={mutedIcon} />
                <Text className="font-manrope-bold text-[11px] tracking-[0.4px] text-ui-text-muted dark:text-ui-text-mutedDark">
                  {refWeightLabel(exercise)}
                </Text>
              </View>
            </View>

            <Text className="font-jakarta-bold text-[28px] leading-8 tracking-[-0.9px] text-ui-text-main dark:text-ui-text-mainDark">
              {exercise.exercise_name}
            </Text>
          </View>

          {/* Divider */}
          <View className="mx-5 h-px bg-ui-text-main/[6%] dark:bg-white/[6%]" />

          {/* Set rows */}
          <View className="px-5 pt-5 pb-5 gap-3">
            {exercise.sets.map((set, si) => {
              const key = `${exercise.id}-${set.id}`;
              const done = completedSets.has(key);
              return (
                <View key={set.id} className="gap-1.5">
                  {/* Main row */}
                  <View className="flex-row items-center gap-2.5">
                    {/* Set label */}
                    <Text
                      className={`font-manrope-bold uppercase text-[11px] tracking-[1.2px] w-6 ${
                        done
                          ? "text-brandSecondary-700 dark:text-brandSecondary-400"
                          : "text-ui-text-muted dark:text-ui-text-mutedDark"
                      }`}
                    >
                      S{si + 1}
                    </Text>

                    {/* Rep range chip */}
                    <View
                      className={`px-[9px] py-1 rounded-lg border ${
                        done
                          ? "bg-transparent border-transparent"
                          : "bg-brandSecondary-400/[14%] dark:bg-brandSecondary-400/[12%] border-brandSecondary-700/15 dark:border-brandSecondary-400/20"
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

                    <View className="flex-1" />

                    {/* Kg input */}
                    <TextInput
                      value={setData[key]?.weight ?? ""}
                      onChangeText={(v) => updateWeight(exercise.id, set.id, v)}
                      keyboardType="decimal-pad"
                      editable={!done}
                      selectTextOnFocus
                      placeholder={
                        set.weight_kg != null ? String(set.weight_kg) : "—"
                      }
                      placeholderTextColor={
                        isDark ? "rgba(255,255,255,0.2)" : "rgba(15,13,32,0.22)"
                      }
                      className={`w-[58px] px-2.5 py-[7px] rounded-[10px] border font-jakarta-semi text-[15px] text-center ${
                        done
                          ? "bg-transparent border-transparent text-ui-text-main/[22%] dark:text-white/[22%]"
                          : "bg-ui-input-light dark:bg-ui-input-dark border-ui-text-main/10 dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
                      }`}
                    />
                    <Text className="font-manrope text-xs text-ui-text-muted dark:text-ui-text-mutedDark">
                      kg
                    </Text>

                    {/* Toggle */}
                    <Pressable
                      onPress={() => toggleSet(exercise.id, set.id)}
                      hitSlop={10}
                      className={`w-[34px] h-[34px] rounded-[17px] items-center justify-center border-[1.5px] active:opacity-70 ${
                        done
                          ? "bg-brandSecondary-400 border-brandSecondary-400"
                          : "bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/[14%] dark:border-white/15"
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

                  {/* Per-set note */}
                  <TextInput
                    value={setNotes[key] ?? ""}
                    onChangeText={(v) =>
                      setSetNotes((prev) => ({ ...prev, [key]: v }))
                    }
                    placeholder="Nota de la serie..."
                    placeholderTextColor={
                      isDark ? "rgba(255,255,255,0.18)" : "rgba(15,13,32,0.2)"
                    }
                    className="ml-[34px] px-3 py-1.5 rounded-[9px] border font-manrope text-xs bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/10 dark:border-white/10 text-ui-text-main dark:text-ui-text-mainDark"
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Series counter ── */}
        <View className="flex-row items-center justify-center gap-2 mb-5">
          <View className="w-1 h-1 rounded-[2px] bg-brandSecondary-400" />
          <Text className="font-manrope-bold uppercase text-[11px] tracking-[1.6px] text-ui-text-muted dark:text-ui-text-mutedDark">
            {doneCount} / {totalSets} series completadas
          </Text>
        </View>
      </ScrollView>

      {/* ── Footer fijo: navegación + acción principal ── */}
      <View
        className="flex-row items-center gap-3 px-5 pt-3.5 border-t bg-ui-background-light dark:bg-ui-background-dark border-ui-text-main/[6%] dark:border-white/[6%]"
        style={{ paddingBottom: insets.bottom + 14 }}
      >
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onEnd();
            }
          }}
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
              shadowOpacity: 0.5,
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
                Finalizar sesión
              </Text>
            )}
            <View className="w-9 h-9 rounded-full items-center justify-center bg-white/20">
              {canNext ? (
                <ChevronRight size={16} color="white" />
              ) : (
                <CheckCircle size={16} color="white" />
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </View>
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

export default function Sesion() {
  const [phase, setPhase] = useState("preview");
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id);

  // El plan que toca se calcula desde session_logs (ver useActivePlanSummary):
  // currentDay trae el plan_week_day; usePlanDayExercises trae su prescripción.
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

  // Sin asignación activa, plan completado o sin día disponible.
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

  // Día sin ejercicios prescritos: no se puede entrenar.
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
        <ActiveSession session={session} onEnd={() => setPhase("preview")} />
      )}
    </View>
  );
}
