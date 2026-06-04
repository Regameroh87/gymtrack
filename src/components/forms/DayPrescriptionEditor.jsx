// React
import { memo, useCallback, useEffect, useState } from "react";

// React Native
import {
  ActivityIndicator,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

// Librerías externas
import { useStore } from "@tanstack/react-form";

// Componentes
import PlanDayExerciseCard from "./PlanDayExerciseCard";

// Tema
import { brandPrimary, ui } from "../../theme/colors";

// Wrapper memoizado: estabiliza el `onChange` por índice para que el memo de
// PlanDayExerciseCard sea efectivo → solo re-renderiza la card cuyo ejercicio cambió.
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
}) {
  const weekIndex = weekNumber - 1;

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      {/* Header: siempre visible, confirma sesión y muestra cantidad de ejercicios */}
      <View
        className="px-6 pt-2 pb-3"
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
        </View>
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
    </KeyboardAvoidingView>
  );
}
