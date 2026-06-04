// React Native
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// React
import { memo, useCallback, useMemo, useRef, useState } from "react";

// Librerías externas
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
import { useRouter } from "expo-router";

// Base de datos / hooks
import { useSessions } from "../../hooks/sessions/use-sessions";
import { fetchSessionExercises } from "../../hooks/sessions/use-session-exercises";

// Componentes
import FormsHeader from "../FormsHeader";

// Tema y assets
import { brandPrimary, ui } from "../../theme/colors";
import { ChevronRight, Plus, X, Calendar } from "../../../assets/icons";

// Media
import { Image } from "expo-image";
import { getCloudinaryUrl } from "../../utils/cloudinary";

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

// ─── Fila de sesión (con acordeón de ejercicios) ─────────────────────────────

// Memoizada: con handlers estables (useCallback) + data estable (useAllSessions
// memoizado), las filas no se re-renderizan en re-renders ajenos del form.
const SessionRow = memo(function SessionRow({
  session,
  isSelected,
  expanded,
  onToggle,
  onSelect,
  getExercisesQuery,
  isDark,
  mutedColor,
}) {
  const { queryKey, queryFn } = getExercisesQuery(session);
  const { data: exercises = [], isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled: expanded,
  });

  const canExpand = (session.exercise_count ?? 0) > 0;

  const coverUri = session.cover_image_uri
    ? (getCloudinaryUrl(session.cover_image_uri) ?? session.cover_image_uri)
    : null;

  const subtitleParts = [
    session.level,
    session.exercise_count ? `${session.exercise_count} ejercicios` : null,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");

  return (
    <View
      className={`mb-2 rounded-xl border overflow-hidden ${
        isSelected ? "border-brandPrimary-500/20" : "border-transparent"
      }`}
      style={{
        backgroundColor: isSelected
          ? "rgba(74,68,228,0.08)"
          : isDark
            ? ui.surfaceSecondary.dark
            : ui.surfaceSecondary.light,
      }}
    >
      <View className="flex-row items-center px-3 py-3">
        <Pressable
          onPress={() => onSelect(session)}
          className="flex-1 flex-row items-center active:opacity-70"
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: coverUri
                ? "transparent"
                : brandPrimary[500] + "22",
              borderWidth: 1,
              borderColor: brandPrimary[500] + "44",
              marginRight: 12,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Calendar size={20} color={brandPrimary[500]} />
            )}
          </View>

          <View className="flex-1 mr-2">
            <Text
              className={`text-base font-manrope ${
                isSelected
                  ? "text-brandPrimary-600 font-manrope-bold"
                  : "text-ui-text-main dark:text-ui-text-mainDark"
              }`}
              numberOfLines={1}
            >
              {session.name}
            </Text>
            {subtitle ? (
              <Text
                className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {isSelected && (
            <Text className="text-brandPrimary-600 font-manrope-bold mr-1">
              ✓
            </Text>
          )}
        </Pressable>

        {canExpand && (
          <Pressable
            onPress={() => onToggle(session.id)}
            hitSlop={10}
            className="w-9 h-9 items-center justify-center rounded-lg active:opacity-50"
          >
            <ChevronRight
              size={16}
              color={mutedColor}
              style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
            />
          </Pressable>
        )}
      </View>

      {expanded && (
        <View
          className="px-3 pb-3 pt-1"
          style={{
            borderTopWidth: 1,
            borderTopColor: ui.input.border,
          }}
        >
          {isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={brandPrimary[500]} />
            </View>
          ) : exercises.length === 0 ? (
            <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark py-2 px-1">
              Sin ejercicios
            </Text>
          ) : (
            <View className="pt-1.5">
              {exercises.map((ex) => (
                <View key={ex.id} className="flex-row items-center py-1.5 px-1">
                  <View
                    className="w-1 h-1 rounded-full mr-2.5"
                    style={{ backgroundColor: brandPrimary[500] }}
                  />
                  <Text
                    className="flex-1 text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
                    numberOfLines={1}
                  >
                    {ex.name ?? "Ejercicio"}
                  </Text>
                  {ex.muscle_group ? (
                    <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark ml-2">
                      {ex.muscle_group}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ─── Componente principal ────────────────────────────────────────────────────

export default function FormPlanWeek({
  form,
  weekNumber,
  weekTitle,
  sessionsHook,
  fetchExercisesFn,
  fetchExercisesFnMap,
  sessionExercisesQueryKey,
  planId,
  prescriptionPathname = "/admin/plans/builder/[week]/[day]",
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const router = useRouter();
  const queryClient = useQueryClient();

  // (route push) para que el montaje pesado del editor no trabe el sheet.
  const sessionSheetRef = useRef(null);
  const copyPickerRef = useRef(null);

  const [activeDayIdx, setActiveDayIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Navega a la pantalla de prescripción del día indicado (mismo form vía contexto).
  const goToPrescription = useCallback(
    (dayIdx) => {
      router.push({
        pathname: prescriptionPathname,
        params: {
          week: String(weekNumber),
          day: String(dayIdx),
          id: planId ?? "",
        },
      });
    },
    [router, prescriptionPathname, weekNumber, planId]
  );

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

  // ─── Helpers de mutación ────────────────────────────────────────────────────

  // Updater funcional: lee siempre el estado más reciente del form, así dos
  // updateWeek seguidos (marcar sesión + llenar ejercicios) no se pisan.
  const updateWeek = useCallback(
    (mutator) => {
      form.setFieldValue("weeks", (prev) =>
        (prev ?? []).map((w, i) => (i === weekIndex ? mutator(w) : w))
      );
    },
    [weekIndex, form]
  );

  // ─── Session picker ─────────────────────────────────────────────────────────

  // Resuelve { queryKey, queryFn } de los ejercicios de una sesión según su origen.
  // Compartido por el preview (acordeón) y la selección, para no duplicar el branching
  // y reusar el mismo cache de react-query. Estable (useCallback) para que el memo de
  // SessionRow sea efectivo.
  const getExercisesQuery = useCallback(
    (session) => {
      let fetchFn, qKey;
      if (fetchExercisesFnMap && session.source) {
        fetchFn = fetchExercisesFnMap[session.source];
        qKey =
          session.source === "custom"
            ? "custom_session_exercises"
            : "session_exercises";
      } else {
        fetchFn = fetchExercisesFn ?? fetchSessionExercises;
        qKey = sessionExercisesQueryKey ?? "session_exercises";
      }
      return {
        queryKey: [qKey, session.id],
        queryFn: () => fetchFn(session.id),
      };
    },
    [fetchExercisesFnMap, fetchExercisesFn, sessionExercisesQueryKey]
  );

  const toggleExpanded = useCallback(
    (id) => setExpandedSessionId((prev) => (prev === id ? null : id)),
    []
  );

  const openSessionPicker = (dayIdx) => {
    setActiveDayIdx(dayIdx);
    setSearchQuery("");
    setExpandedSessionId(null);
    Keyboard.dismiss();
    sessionSheetRef.current?.present();
  };

  const handleSessionSelect = useCallback(
    async (session) => {
      const dayIdx = activeDayIdx;
      if (dayIdx === null) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Los ejercicios viven en SQLite local (lectura de milisegundos): los buscamos
      // y escribimos todo el día en una sola mutación, luego cerramos y navegamos.
      let rawExercises = [];
      try {
        rawExercises = await queryClient.fetchQuery(getExercisesQuery(session));
      } catch {
        rawExercises = [];
      }

      const exercises = rawExercises.map((se) => ({
        id: Crypto.randomUUID(),
        session_exercise_id: se.id,
        exercise_id: se.exercise_id,
        exercise_name: se.name,
        exercise_muscle_group: se.muscle_group ?? "",
        exercise_image_uri: se.image_uri ?? null,
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

      sessionSheetRef.current?.dismiss();
      goToPrescription(dayIdx);
    },
    [activeDayIdx, goToPrescription, queryClient, getExercisesQuery, updateWeek]
  );

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

  if (!week) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope">
          Semana no encontrada
        </Text>
      </View>
    );
  }

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
                day.session_id ? goToPrescription(idx) : openSessionPicker(idx)
              }
              onClear={() => handleClearDay(idx)}
              mutedColor={mutedColor}
            />
          ))}
        </View>
      </ScrollView>

      {/* ─── SHEET DE SESIÓN (picker → prescripción, mismo modal) ───────────── */}
      <BottomSheetModal
        ref={sessionSheetRef}
        index={0}
        snapPoints={["92%"]}
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
          setExpandedSessionId(null);
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
          extraData={`${expandedSessionId}|${activeDayIdx}`}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ListHeaderComponent={() => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                sessionSheetRef.current?.dismiss();
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
              <SessionRow
                session={session}
                isSelected={isSelected}
                expanded={expandedSessionId === session.id}
                onToggle={toggleExpanded}
                onSelect={handleSessionSelect}
                getExercisesQuery={getExercisesQuery}
                isDark={isDark}
                mutedColor={mutedColor}
              />
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
    </KeyboardAvoidingView>
  );
}
