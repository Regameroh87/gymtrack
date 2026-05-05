// React Native
import { View, Text, Pressable } from "react-native";

// Librerías externas
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";

// Tema y assets
import { Barbell, ChevronRight, Trash } from "../../../assets/icons";
import { ui } from "../../theme/colors";

const OBJECTIVE_ACCENT = {
  hipertrofia: "#6366f1",
  fuerza: "#ef4444",
  perdida_grasa: "#22c55e",
  resistencia: "#38bdf8",
  acondicionamiento: "#f59e0b",
  rehabilitacion: "#a855f7",
};

const OBJECTIVE_LABELS = {
  hipertrofia: "Hipertrofia",
  fuerza: "Fuerza",
  perdida_grasa: "Pérdida de grasa",
  resistencia: "Resistencia",
  acondicionamiento: "Acondicionamiento",
  rehabilitacion: "Rehabilitación",
};

export default function TrainingPlanDayCard({
  day,
  dayNumber,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;
  const disabledColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  const accent = OBJECTIVE_ACCENT[day.routine_objective] ?? "#6366f1";
  const objectiveLabel = OBJECTIVE_LABELS[day.routine_objective];

  return (
    <View className="mb-2.5 border border-ui-input-border rounded-xl overflow-hidden bg-ui-surface-light dark:bg-ui-surface-dark">
      <View className="flex-row items-center p-3">
        {/* Flechas de orden */}
        <View className="pr-2 -ml-1 justify-center">
          <Pressable
            onPress={() => {
              onMoveUp();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            disabled={!canMoveUp}
            hitSlop={6}
            className="active:opacity-50"
          >
            <ChevronRight
              size={14}
              color={canMoveUp ? mutedColor : disabledColor}
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              onMoveDown();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            disabled={!canMoveDown}
            hitSlop={6}
            className="active:opacity-50"
          >
            <ChevronRight
              size={14}
              color={canMoveDown ? mutedColor : disabledColor}
              style={{ transform: [{ rotate: "90deg" }] }}
            />
          </Pressable>
        </View>

        {/* Número de día */}
        <View
          className="w-10 h-10 rounded-lg items-center justify-center mr-2.5"
          style={{ backgroundColor: accent + "22" }}
        >
          <Text
            className="text-[10px] font-manrope-semi uppercase"
            style={{ color: accent }}
          >
            Día
          </Text>
          <Text
            className="text-[13px] font-jakarta-bold leading-tight"
            style={{ color: accent }}
          >
            {dayNumber}
          </Text>
        </View>

        {/* Info de rutina */}
        <View className="flex-1">
          <Text
            className="font-jakarta-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {day.routine_name}
          </Text>
          {objectiveLabel && (
            <View className="flex-row items-center mt-0.5">
              <Barbell size={10} color={accent} />
              <Text
                className="text-[10px] font-manrope ml-1"
                style={{ color: accent }}
              >
                {objectiveLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Eliminar */}
        <Pressable
          onPress={() => {
            onDelete();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          className="p-2"
          hitSlop={8}
        >
          <Trash size={15} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}
