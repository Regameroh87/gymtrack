// React Native
import { Text, View } from "react-native";

// Tema
import { brandPrimary } from "../../theme/colors";

export function prescriptionLabel(ex) {
  const sets = ex.sets ?? 3;
  if (ex.prescription_mode === "duration" && ex.duration_seconds) {
    return `${sets} × ${ex.duration_seconds}s`;
  }
  const min = ex.reps_min;
  const max = ex.reps_max;
  if (min != null && max != null && min !== max) {
    return `${sets} × ${min}–${max} reps`;
  }
  if (min != null) return `${sets} × ${min} reps`;
  return `${sets} series`;
}

export function intensityLabel(ex) {
  if (ex.intensity_mode === "rir" && ex.rir != null) return `RIR ${ex.rir}`;
  if (ex.intensity_mode === "rpe" && ex.rpe != null) return `RPE ${ex.rpe}`;
  return null;
}

export default function SessionExerciseRow({
  exercise,
  position,
  accent = brandPrimary[500],
  compact = false,
  showNotes = true,
}) {
  const intensity = intensityLabel(exercise);

  return (
    <View
      className="bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl flex-row items-center"
      style={{
        padding: compact ? 10 : 14,
        borderWidth: 0.5,
        borderColor: "rgba(196,190,230,0.12)",
        gap: compact ? 10 : 12,
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: compact ? 26 : 32,
          height: compact ? 26 : 32,
          borderRadius: compact ? 13 : 16,
          backgroundColor: accent + "22",
          borderWidth: 1,
          borderColor: accent + "44",
          flexShrink: 0,
        }}
      >
        <Text
          style={{
            color: accent,
            fontSize: compact ? 11 : 13,
            fontFamily: "Manrope_700Bold",
          }}
        >
          {position}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          className="text-ui-text-main dark:text-ui-text-mainDark"
          style={{
            fontSize: compact ? 13 : 14,
            fontFamily: "PlusJakartaSans_700Bold",
            marginBottom: 3,
          }}
        >
          {exercise.exercise_name}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            flexWrap: "wrap",
          }}
        >
          <Text
            style={{
              color: accent,
              fontSize: compact ? 11 : 12,
              fontFamily: "Manrope_700Bold",
            }}
          >
            {prescriptionLabel(exercise)}
          </Text>

          {!compact && exercise.rest_seconds != null && (
            <>
              <Text style={{ color: "rgba(196,190,230,0.35)", fontSize: 10 }}>
                ·
              </Text>
              <Text
                className="text-ui-text-muted dark:text-ui-text-mutedDark"
                style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold" }}
              >
                {exercise.rest_seconds}s descanso
              </Text>
            </>
          )}

          {intensity && (
            <>
              <Text style={{ color: "rgba(196,190,230,0.35)", fontSize: 10 }}>
                ·
              </Text>
              <Text
                style={{
                  color: accent,
                  fontSize: compact ? 11 : 12,
                  fontFamily: "Manrope_600SemiBold",
                  opacity: 0.75,
                }}
              >
                {intensity}
              </Text>
            </>
          )}
        </View>

        {showNotes && exercise.notes ? (
          <Text
            numberOfLines={1}
            className="text-ui-text-muted dark:text-ui-text-mutedDark"
            style={{
              fontSize: 11,
              fontFamily: "Manrope_400Regular",
              marginTop: 3,
            }}
          >
            {exercise.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
