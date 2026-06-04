// React Native
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

// Librerías externas
import { useStore } from "@tanstack/react-form";
import { useColorScheme } from "nativewind";

// Componentes
import PlanDayExerciseCard from "./PlanDayExerciseCard";

// Tema
import { ui } from "../../theme/colors";

// Editor de la prescripción de un día (series/reps/peso/descanso/intensidad/…).
// Vive en su propia pantalla (route push) en vez de un bottom sheet: la transición
// nativa enmascara el montaje pesado de los inputs y evita el jank del sheet.
export default function DayPrescriptionEditor({
  form,
  weekNumber,
  dayIdx,
  weekTitle,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const weeks = useStore(form.store, (s) => s.values.weeks ?? []);
  const weekIndex = weekNumber - 1;
  const day = weeks[weekIndex]?.days?.[dayIdx] ?? null;

  const updateExercise = (exIdx, updates) => {
    const newWeeks = weeks.map((w, i) =>
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
    );
    form.setFieldValue("weeks", newWeeks);
  };

  if (!day) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope">
          Día no encontrado
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
    </KeyboardAvoidingView>
  );
}
