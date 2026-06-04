// React
import { useEffect, useState } from "react";

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

// Editor de la prescripción de un día (series/reps/peso/descanso/intensidad/…).
// Vive en su propia pantalla (route push) en vez de un bottom sheet: la transición
// nativa enmascara el montaje pesado de los inputs y evita el jank del sheet.
export default function DayPrescriptionEditor({
  form,
  weekNumber,
  dayIdx,
  weekTitle,
}) {
  // Difiere el montaje pesado (las cards con sus ~100 inputs) hasta que termine la
  // transición de navegación: así el push corre fluido y las cards aparecen después.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  const weeks = useStore(form.store, (s) => s.values.weeks ?? []);
  const weekIndex = weekNumber - 1;
  const day = weeks[weekIndex]?.days?.[dayIdx] ?? null;

  const updateExercise = (exIdx, updates) => {
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
  };

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

  // Header inmediato (confirma la sesión elegida). El contenido pesado (las cards con
  // sus inputs) espera a que termine la transición de navegación.
  const showContentSpinner = !ready;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <View
        className="px-6 pt-2 pb-3"
        style={{ borderBottomWidth: 1, borderBottomColor: ui.input.border }}
      >
        <Text className="text-xs font-manrope-semi uppercase tracking-label text-ui-text-muted dark:text-ui-text-mutedDark">
          Día {day.day_number} · {weekTitle ?? `Semana ${weekNumber}`}
        </Text>
        <Text className="text-xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark mt-0.5">
          {day.session_name ?? "Sesión"}
        </Text>
      </View>

      {showContentSpinner ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={brandPrimary[500]} />
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
          {(day.exercises?.length ?? 0) === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                Esta sesión no tiene ejercicios cargados.
              </Text>
            </View>
          ) : (
            day.exercises.map((ex, exIdx) => (
              <PlanDayExerciseCard
                key={ex.id}
                exercise={ex}
                onChange={(updates) => updateExercise(exIdx, updates)}
              />
            ))
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
