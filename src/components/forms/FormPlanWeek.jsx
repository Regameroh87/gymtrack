// React Native
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// React
import { useCallback, useMemo, useRef, useState } from "react";

// Librerías externas
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
import { useRouter } from "expo-router";

// Base de datos / hooks
import { useSessions } from "../../hooks/useSessions";
import { fetchSessionExercises } from "../../hooks/useSessionExercises";

// Componentes
import FormsHeader from "../FormsHeader";
import PlanDayExerciseCard from "./PlanDayExerciseCard";

// Tema y assets
import { brandPrimary, ui } from "../../theme/colors";
import { ChevronRight, Plus, X } from "../../../assets/icons";

// ─── Tarjeta de día ──────────────────────────────────────────────────────────

function DayCard({ day, onPress, onClear, mutedColor }) {
  const hasSession = !!day.session_id;
  const exerciseCount = day.exercises?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-3.5 py-3 mb-2 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:scale-[0.98]"
    >
      <View className="w-10 h-10 rounded-lg items-center justify-center mr-3.5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <Text className="text-[9px] font-manrope-semi uppercase text-brandPrimary-500 dark:text-brandPrimary-400">
          Día
        </Text>
        <Text className="text-sm font-jakarta-bold leading-tight text-brandPrimary-600 dark:text-brandPrimary-400">
          {day.day_number}
        </Text>
      </View>

      <View className="flex-1 mr-2">
        <Text
          className={`text-sm font-manrope ${
            hasSession
              ? "text-ui-text-main dark:text-ui-text-mainDark"
              : "text-ui-text-muted dark:text-ui-text-mutedDark"
          }`}
          numberOfLines={1}
        >
          {hasSession ? day.session_name : "Asignar sesión..."}
        </Text>
        {hasSession && (
          <Text
            className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5"
            numberOfLines={1}
          >
            {exerciseCount > 0
              ? `${exerciseCount} ejercicio${exerciseCount !== 1 ? "s" : ""} · Tocá para editar`
              : "Tocá para editar prescripción"}
          </Text>
        )}
      </View>

      {hasSession ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClear();
          }}
          hitSlop={10}
          className="active:opacity-50 p-0.5"
        >
          <X size={14} color={mutedColor} />
        </Pressable>
      ) : (
        <ChevronRight size={14} color={mutedColor} />
      )}
    </Pressable>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function FormPlanWeek({
  form,
  weekNumber,
  weekTitle,
  sessionsHook,
  fetchExercisesFn,
  sessionExercisesQueryKey,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionPickerRef = useRef(null);
  const copyPickerRef = useRef(null);
  const prescriptionSheetRef = useRef(null);

  const [activeDayIdx, setActiveDayIdx] = useState(null);
  const [prescriptionDayIdx, setPrescriptionDayIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: availableSessions = [] } = (sessionsHook ?? useSessions)();

  const weeks = useStore(form.store, (s) => s.values.weeks ?? []);
  const planName = useStore(form.store, (s) => s.values.name ?? "");
  const weekIndex = weekNumber - 1;
  const week = weeks[weekIndex];

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return availableSessions;
    const q = searchQuery.toLowerCase();
    return availableSessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableSessions, searchQuery]);

  const otherWeeks = useMemo(
    () => weeks.filter((w) => w.week_number !== weekNumber),
    [weeks, weekNumber]
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  if (!week) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope">
          Semana no encontrada
        </Text>
      </View>
    );
  }

  // ─── Helpers de mutación ────────────────────────────────────────────────────

  const updateWeek = (mutator) => {
    const newWeeks = weeks.map((w, i) => (i === weekIndex ? mutator(w) : w));
    form.setFieldValue("weeks", newWeeks);
  };

  const handleUpdateExercise = (dayIdx, exIdx, updates) => {
    updateWeek((w) => ({
      ...w,
      days: w.days.map((d, j) =>
        j !== dayIdx
          ? d
          : {
              ...d,
              exercises: d.exercises.map((ex, k) =>
                k !== exIdx ? ex : { ...ex, ...updates }
              ),
            }
      ),
    }));
  };

  // ─── Session picker ─────────────────────────────────────────────────────────

  const openSessionPicker = (dayIdx) => {
    setActiveDayIdx(dayIdx);
    setSearchQuery("");
    Keyboard.dismiss();
    sessionPickerRef.current?.present();
  };

  const handleSessionSelect = async (session) => {
    const dayIdx = activeDayIdx;
    if (dayIdx === null) return;

    sessionPickerRef.current?.dismiss();
    setActiveDayIdx(null);
    setSearchQuery("");

    let rawExercises = [];
    try {
      rawExercises = await queryClient.fetchQuery({
        queryKey: [sessionExercisesQueryKey ?? "session_exercises", session.id],
        queryFn: () => (fetchExercisesFn ?? fetchSessionExercises)(session.id),
      });
    } catch {
      rawExercises = [];
    }

    const exercises = rawExercises.map((se) => ({
      id: Crypto.randomUUID(),
      session_exercise_id: se.id,
      exercise_id: se.exercise_id,
      exercise_name: se.name,
      exercise_muscle_group: se.muscle_group ?? "",
      position: se.position,
      prescription_mode: "reps",
      intensity_mode: "none",
      rir: null,
      rpe: null,
      tempo: "",
      notes: "",
      set_configs: Array.from({ length: 4 }, () => ({
        reps_min: 8,
        reps_max: 12,
        duration_seconds: null,
        weight_kg: null,
        rest_seconds: 90,
      })),
    }));

    updateWeek((w) => ({
      ...w,
      days: w.days.map((d, i) =>
        i !== dayIdx
          ? d
          : {
              ...d,
              session_id: session.id,
              session_name: session.name,
              exercises,
            }
      ),
    }));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      setPrescriptionDayIdx(dayIdx);
      prescriptionSheetRef.current?.present();
    }, 350);
  };

  // ─── Prescription sheet ─────────────────────────────────────────────────────

  const openPrescriptionSheet = (dayIdx) => {
    setPrescriptionDayIdx(dayIdx);
    prescriptionSheetRef.current?.present();
  };

  // ─── Clear / Copy ───────────────────────────────────────────────────────────

  const handleClearDay = (dayIdx) => {
    updateWeek((w) => ({
      ...w,
      days: w.days.map((d, i) =>
        i === dayIdx
          ? { ...d, session_id: null, session_name: null, exercises: [] }
          : d
      ),
    }));
  };

  const handleCopyFromWeek = (sourceWeek) => {
    updateWeek((w) => ({
      ...w,
      days: w.days.map((d, i) => {
        const src = sourceWeek.days[i];
        if (!src) return d;
        return {
          ...d,
          session_id: src.session_id,
          session_name: src.session_name,
          exercises: (src.exercises ?? []).map((ex) => ({
            ...ex,
            id: Crypto.randomUUID(),
            set_configs: (ex.set_configs ?? []).map((cfg) => ({
              ...cfg,
              id: Crypto.randomUUID(),
            })),
          })),
        };
      }),
    }));
    copyPickerRef.current?.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const prescriptionDay =
    prescriptionDayIdx !== null ? week.days[prescriptionDayIdx] : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <FormsHeader
          title={weekTitle ?? `Semana ${weekNumber}`}
          subtitle={
            planName
              ? `Asigná una sesión a cada día de "${planName}".`
              : "Asigná una sesión a cada día."
          }
        />

        <View className="px-4 pt-4">
          {/* COPIAR DE OTRA SEMANA */}
          {otherWeeks.length > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                copyPickerRef.current?.present();
              }}
              className="flex-row items-center justify-between px-4 py-3 mb-5 rounded-xl border border-dashed border-brandPrimary-500/40 active:scale-[0.98]"
            >
              <Text className="text-sm font-manrope-semi text-brandPrimary-600 dark:text-brandPrimary-400">
                Copiar de otra semana
              </Text>
              <ChevronRight size={14} color={mutedColor} />
            </Pressable>
          )}

          {/* DÍAS */}
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
            SESIONES POR DÍA
          </Text>
          {week.days.map((day, idx) => (
            <DayCard
              key={day.id}
              day={day}
              onPress={() =>
                day.session_id
                  ? openPrescriptionSheet(idx)
                  : openSessionPicker(idx)
              }
              onClear={() => handleClearDay(idx)}
              mutedColor={mutedColor}
            />
          ))}
        </View>
      </ScrollView>

      {/* ─── PICKER DE SESIONES ────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={sessionPickerRef}
        index={1}
        snapPoints={["50%", "90%"]}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? ui.surfaceSecondary.dark
            : ui.surfaceSecondary.light,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
        onDismiss={() => {
          setSearchQuery("");
          setActiveDayIdx(null);
        }}
      >
        <View className="px-6 pt-4 pb-2">
          <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark mb-4">
            Elegir sesión
            {activeDayIdx !== null ? ` · Día ${activeDayIdx + 1}` : ""}
          </Text>
          <BottomSheetTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar sesión..."
            placeholderTextColor={mutedColor}
            style={{
              backgroundColor: isDark
                ? ui.surfaceSecondary.dark
                : ui.surfaceSecondary.light,
              color: isDark ? ui.text.mainDark : ui.text.main,
              padding: 14,
              borderRadius: 12,
              fontFamily: "Manrope_400Regular",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
            }}
          />
        </View>

        <BottomSheetFlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ListHeaderComponent={() => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                sessionPickerRef.current?.dismiss();
                setActiveDayIdx(null);
                router.push("/biblioteca/sesiones/builder");
              }}
              className="flex-row items-center p-4 mb-3 rounded-xl border border-dashed border-brandPrimary-500/50 active:scale-[0.97]"
              style={{ backgroundColor: "rgba(74,68,228,0.06)" }}
            >
              <View
                className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: brandPrimary[500] + "22" }}
              >
                <Plus size={16} color={brandPrimary[500]} />
              </View>
              <Text className="text-sm font-manrope-semi text-brandPrimary-600 dark:text-brandPrimary-400">
                Crear sesión nueva
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View className="items-center justify-center p-6 mt-4">
              <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-center font-manrope">
                {searchQuery
                  ? `Sin resultados para "${searchQuery}"`
                  : "No hay sesiones creadas aún"}
              </Text>
            </View>
          )}
          renderItem={({ item: session }) => {
            const isSelected =
              activeDayIdx !== null &&
              week.days[activeDayIdx]?.session_id === session.id;

            return (
              <Pressable
                onPress={() => handleSessionSelect(session)}
                className={`p-4 mb-2 rounded-xl flex-row justify-between items-center active:scale-[0.97] border ${
                  isSelected
                    ? "border-brandPrimary-500/20"
                    : "border-transparent"
                }`}
                style={{
                  backgroundColor: isSelected
                    ? "rgba(74,68,228,0.08)"
                    : isDark
                      ? ui.surfaceSecondary.dark
                      : ui.surfaceSecondary.light,
                }}
              >
                <Text
                  className={`text-base font-manrope ${
                    isSelected
                      ? "text-brandPrimary-600 font-manrope-bold"
                      : "text-ui-text-main dark:text-ui-text-mainDark"
                  }`}
                >
                  {session.name}
                </Text>
                {isSelected && (
                  <Text className="text-brandPrimary-600 font-manrope-bold">
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      </BottomSheetModal>

      {/* ─── PICKER DE SEMANA A COPIAR ──────────────────────────────────────── */}
      <BottomSheetModal
        ref={copyPickerRef}
        index={0}
        snapPoints={["50%", "80%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? ui.surfaceSecondary.dark
            : ui.surfaceSecondary.light,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
      >
        <View className="px-6 pt-4 pb-2">
          <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark mb-4">
            Copiar desde
          </Text>
        </View>

        <BottomSheetFlatList
          data={otherWeeks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ListEmptyComponent={() => (
            <View className="items-center justify-center p-6 mt-4">
              <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-center font-manrope">
                No hay otras semanas en el plan.
              </Text>
            </View>
          )}
          renderItem={({ item: srcWeek }) => {
            const assigned = srcWeek.days.filter((d) => d.session_id).length;
            const total = srcWeek.days.length;
            return (
              <Pressable
                onPress={() => handleCopyFromWeek(srcWeek)}
                className="p-4 mb-2 rounded-xl flex-row justify-between items-center active:scale-[0.97]"
                style={{
                  backgroundColor: isDark
                    ? ui.surfaceSecondary.dark
                    : ui.surfaceSecondary.light,
                }}
              >
                <View>
                  <Text className="text-base font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
                    Semana {srcWeek.week_number}
                  </Text>
                  <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                    {assigned === 0
                      ? "Sin definir"
                      : `${assigned}/${total} días asignados`}
                  </Text>
                </View>
                <ChevronRight size={14} color={mutedColor} />
              </Pressable>
            );
          }}
        />
      </BottomSheetModal>

      {/* ─── SHEET DE PRESCRIPCIÓN ──────────────────────────────────────────── */}
      <BottomSheetModal
        ref={prescriptionSheetRef}
        index={0}
        snapPoints={["95%"]}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? ui.surfaceSecondary.dark
            : ui.surfaceSecondary.light,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
        onDismiss={() => setPrescriptionDayIdx(null)}
      >
        {prescriptionDay ? (
          <>
            <View
              className="px-6 pt-4 pb-3"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: ui.input.border,
              }}
            >
              <Text className="text-xs font-manrope-semi uppercase tracking-label text-ui-text-muted dark:text-ui-text-mutedDark">
                Día {prescriptionDay.day_number} ·{" "}
                {weekTitle ?? `Semana ${weekNumber}`}
              </Text>
              <Text className="text-xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark mt-0.5">
                {prescriptionDay.session_name}
              </Text>
            </View>

            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 100,
              }}
            >
              {prescriptionDay.exercises.length === 0 ? (
                <View className="items-center justify-center py-16">
                  <Text className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                    Esta sesión no tiene ejercicios cargados.
                  </Text>
                </View>
              ) : (
                prescriptionDay.exercises.map((ex, exIdx) => (
                  <PlanDayExerciseCard
                    key={ex.id}
                    exercise={ex}
                    onChange={(updates) =>
                      handleUpdateExercise(prescriptionDayIdx, exIdx, updates)
                    }
                  />
                ))
              )}
            </BottomSheetScrollView>
          </>
        ) : null}
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
}
