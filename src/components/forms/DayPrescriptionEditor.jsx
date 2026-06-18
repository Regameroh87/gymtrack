// React
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

// React Native
import {
  ActivityIndicator,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

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
import { useStore } from "@tanstack/react-form";
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";

// Componentes
import PlanDayExerciseCard from "./PlanDayExerciseCard";

// Hooks
import { useExercises } from "../../hooks/exercises/use-exercises";
import { useCatalogExercises } from "../../hooks/exercises/use-catalog-exercises";

// Utils
import { forkSession } from "../../utils/fork-session";

// DB
import { supabase } from "../../database/supabase";

// Tema e iconos
import { ui } from "../../theme/colors";
import { useGymTheme } from "../../contexts/gym-theme-context";
import { Plus } from "../../../assets/icons";

// Wrapper para drag reordenamiento: cada item necesita llamar a los hooks dentro del
// contexto de ReorderableList, por eso vive aquí y no en PlanDayExerciseCard.
const DraggableExerciseItem = memo(function DraggableExerciseItem({
  item,
  index,
  onUpdate,
  onDelete,
}) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  const handleChange = useCallback(
    (updates) => onUpdate(index, updates),
    [index, onUpdate]
  );

  return (
    <PlanDayExerciseCard
      exercise={item}
      onChange={handleChange}
      onDelete={onDelete}
      drag={drag}
      isActive={isActive}
    />
  );
});

// Wrapper memoizado sin drag: para el modo admin (sin allowAddExercise).
const ExerciseItem = memo(function ExerciseItem({ exercise, exIdx, onUpdate }) {
  const handleChange = useCallback(
    (updates) => onUpdate(exIdx, updates),
    [exIdx, onUpdate]
  );
  return <PlanDayExerciseCard exercise={exercise} onChange={handleChange} />;
});

// Editor de la prescripción de un día (series/reps/peso/descanso/intensidad/…).
// Vive en su propia pantalla (route push) en vez de un bottom sheet: la transición
// nativa enmascara el montaje pesado de los inputs y evita el jank del sheet.
export default function DayPrescriptionEditor({
  form,
  weekNumber,
  dayIdx,
  weekTitle,
  allowAddExercise = false,
}) {
  const weekIndex = weekNumber - 1;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandPrimary } = useGymTheme();

  // Selector narrowo: solo re-renderiza cuando cambia ESTE día — no otros días ni semanas.
  const day = useStore(
    form.store,
    (s) => s.values.weeks?.[weekIndex]?.days?.[dayIdx] ?? null
  );

  // Difiere el montaje pesado (las cards con sus inputs) hasta que termine la
  // transición de navegación: así el push corre fluido y las cards aparecen después.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  // ─── Add exercise ──────────────────────────────────────────────────────────
  const exerciseSheetRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: gymExercises = [] } = useExercises();
  // Ejercicios de catálogo (read-only): se agregan al plan referenciados por id igual
  // que los del gym; el fork a custom los resuelve por exercise_source="base".
  const { data: catalogExercises = [] } = useCatalogExercises();

  const allExercises = useMemo(() => {
    const byId = new Map();
    for (const e of gymExercises) byId.set(e.id, e);
    for (const e of catalogExercises) if (!byId.has(e.id)) byId.set(e.id, e);
    return [...byId.values()];
  }, [gymExercises, catalogExercises]);

  const pickerExercises = useMemo(
    () =>
      allExercises.filter(
        (e) =>
          !day?.exercises?.some((ex) => ex.exercise_id === e.id) &&
          e.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [allExercises, day?.exercises, searchQuery]
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

  // Updater funcional estable: solo cambia si cambia el día/semana/form en sí.
  const updateExercise = useCallback(
    (exIdx, updates) => {
      form.setFieldValue("weeks", (prev) =>
        (prev ?? []).map((w, i) =>
          i !== weekIndex
            ? w
            : {
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
              }
        )
      );
    },
    [weekIndex, dayIdx, form]
  );

  const removeExercise = useCallback(
    (exIdx) => {
      form.setFieldValue("weeks", (prev) =>
        (prev ?? []).map((w, i) =>
          i !== weekIndex
            ? w
            : {
                ...w,
                days: w.days.map((d, j) =>
                  j !== dayIdx
                    ? d
                    : {
                        ...d,
                        exercises: d.exercises
                          .filter((_, k) => k !== exIdx)
                          .map((ex, k) => ({ ...ex, position: k })),
                      }
                ),
              }
        )
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [weekIndex, dayIdx, form]
  );

  const reorderExercises = useCallback(
    ({ from, to }) => {
      form.setFieldValue("weeks", (prev) =>
        (prev ?? []).map((w, i) =>
          i !== weekIndex
            ? w
            : {
                ...w,
                days: w.days.map((d, j) =>
                  j !== dayIdx
                    ? d
                    : {
                        ...d,
                        exercises: reorderItems(d.exercises, from, to).map(
                          (ex, k) => ({ ...ex, position: k })
                        ),
                      }
                ),
              }
        )
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [weekIndex, dayIdx, form]
  );

  const handleAddExercise = useCallback(
    async (ex) => {
      exerciseSheetRef.current?.dismiss();
      setSearchQuery("");

      const newEntry = {
        id: Crypto.randomUUID(),
        session_exercise_id: null,
        exercise_id: ex.id,
        exercise_name: ex.name,
        exercise_muscle_group: ex.muscle_group ?? "",
        exercise_image_uri: ex.image_uri ?? null,
        position: day?.exercises?.length ?? 0,
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
      };

      if (day?.session_source === "gym") {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const userId = authSession?.user?.id ?? null;
        const newCustomSessionId = await forkSession(
          userId,
          day.session_name,
          day.exercises ?? [],
          newEntry
        );

        form.setFieldValue("weeks", (prev) =>
          (prev ?? []).map((w, i) =>
            i !== weekIndex
              ? w
              : {
                  ...w,
                  days: w.days.map((d, j) =>
                    j !== dayIdx
                      ? d
                      : {
                          ...d,
                          session_id: newCustomSessionId,
                          session_source: "custom",
                          exercises: [...(d.exercises ?? []), newEntry],
                        }
                  ),
                }
          )
        );
      } else {
        form.setFieldValue("weeks", (prev) =>
          (prev ?? []).map((w, i) =>
            i !== weekIndex
              ? w
              : {
                  ...w,
                  days: w.days.map((d, j) =>
                    j !== dayIdx
                      ? d
                      : {
                          ...d,
                          exercises: [...(d.exercises ?? []), newEntry],
                        }
                  ),
                }
          )
        );
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [day, weekIndex, dayIdx, form]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  // Índice fuera de rango (no debería pasar en navegación normal).
  if (!day) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        {ready ? (
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope">
            Día no encontrado
          </Text>
        ) : (
          <ActivityIndicator size="large" color={brandPrimary[500]} />
        )}
      </View>
    );
  }

  const exerciseCount = day.exercises?.length ?? 0;
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      {/* Header: siempre visible, confirma sesión y muestra cantidad de ejercicios */}
      <View
        className="px-6 pt-6 pb-3"
        style={{ borderBottomWidth: 1, borderBottomColor: ui.input.border }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-manrope-semi uppercase tracking-label text-ui-text-muted dark:text-ui-text-mutedDark">
            Día {day.day_number} · {weekTitle ?? `Semana ${weekNumber}`}
          </Text>
          {exerciseCount > 0 && (
            <View
              className="px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: brandPrimary[600] + "18" }}
            >
              <Text
                className="text-[11px] font-manrope-semi"
                style={{ color: brandPrimary[600] }}
              >
                {exerciseCount} ejercicio{exerciseCount !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark mt-0.5">
          {day.session_name ?? "Sesión"}
        </Text>
      </View>

      {!ready ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={brandPrimary[500]} />
        </View>
      ) : exerciseCount === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-4xl mb-4"
            style={{ color: brandPrimary[600] + "40" }}
          >
            🏋️
          </Text>
          <Text className="font-jakarta text-base text-center text-ui-text-muted dark:text-ui-text-mutedDark mb-1">
            Sin ejercicios
          </Text>
          <Text className="font-manrope text-sm text-center text-ui-text-muted dark:text-ui-text-mutedDark opacity-70">
            Esta sesión no tiene ejercicios cargados.
          </Text>
          {allowAddExercise && (
            <Pressable
              onPress={() => exerciseSheetRef.current?.present()}
              className="mt-5 flex-row items-center gap-2 px-5 py-2.5 rounded-xl active:opacity-70"
              style={{ backgroundColor: brandPrimary[600] + "14" }}
            >
              <Plus size={15} color={brandPrimary[600]} />
              <Text
                className="text-sm font-manrope-semi"
                style={{ color: brandPrimary[600] }}
              >
                Agregar ejercicio
              </Text>
            </Pressable>
          )}
        </View>
      ) : allowAddExercise ? (
        <ReorderableList
          data={day.exercises}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onReorder={reorderExercises}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 100,
          }}
          renderItem={({ item, index }) => (
            <DraggableExerciseItem
              item={item}
              index={index}
              onUpdate={updateExercise}
              onDelete={() => removeExercise(index)}
            />
          )}
          ListFooterComponent={
            <Pressable
              onPress={() => exerciseSheetRef.current?.present()}
              className="mt-2 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed active:opacity-60"
              style={{ borderColor: brandPrimary[500] + "50" }}
            >
              <Plus size={15} color={brandPrimary[500]} />
              <Text
                className="text-sm font-manrope-semi"
                style={{ color: brandPrimary[500] }}
              >
                Agregar ejercicio
              </Text>
            </Pressable>
          }
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 100,
          }}
        >
          {day.exercises.map((ex, exIdx) => (
            <ExerciseItem
              key={ex.id}
              exercise={ex}
              exIdx={exIdx}
              onUpdate={updateExercise}
            />
          ))}
        </ScrollView>
      )}

      {/* ─── Exercise picker bottom sheet ──────────────────────────────── */}
      {allowAddExercise && (
        <BottomSheetModal
          ref={exerciseSheetRef}
          snapPoints={["50%", "85%"]}
          backdropComponent={renderBackdrop}
          onDismiss={() => setSearchQuery("")}
          backgroundStyle={{
            backgroundColor: isDark
              ? ui.surfaceSecondary.dark
              : ui.surfaceSecondary.light,
          }}
          handleIndicatorStyle={{ backgroundColor: mutedColor }}
        >
          <View className="px-4 pb-2">
            <Text className="text-base font-jakarta text-ui-text-main dark:text-ui-text-mainDark mb-3">
              Agregar ejercicio
            </Text>
            <BottomSheetTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar ejercicio..."
              placeholderTextColor={mutedColor}
              style={{
                backgroundColor: isDark ? ui.input.dark : ui.input.light,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                fontFamily: "Manrope",
                color: isDark ? ui.text.mainDark : ui.text.main,
                borderWidth: 1,
                borderColor: ui.input.border,
              }}
            />
          </View>

          <BottomSheetFlatList
            data={pickerExercises}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListEmptyComponent={
              <View className="py-10 items-center">
                <Text className="font-manrope text-sm text-ui-text-muted dark:text-ui-text-mutedDark">
                  No se encontraron ejercicios
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleAddExercise(item)}
                className="flex-row items-center py-3 border-b active:opacity-60"
                style={{ borderBottomColor: ui.input.border }}
              >
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: brandPrimary[500] + "18" }}
                >
                  <Plus size={14} color={brandPrimary[500]} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="text-sm font-manrope text-ui-text-main dark:text-ui-text-mainDark flex-shrink"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.is_catalog && (
                      <View
                        className="px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{ backgroundColor: brandPrimary[500] + "18" }}
                      >
                        <Text
                          className="text-[10px] font-manrope-semi uppercase tracking-wide"
                          style={{ color: brandPrimary[600] }}
                        >
                          Catálogo
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.muscle_group && (
                    <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                      {item.muscle_group}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        </BottomSheetModal>
      )}
    </KeyboardAvoidingView>
  );
}
