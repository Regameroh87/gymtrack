// React Native
import { Pressable, Text, View } from "react-native";

// Librerías externas
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";

// Tema y assets
import { brandPrimary, ui } from "../../theme/colors";
import { Barbell } from "../../../assets/icons";

// ─── SegmentedControl ────────────────────────────────────────────────────────

function Seg({ options, value, onChange, isDark }) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isDark ? ui.input.dark : ui.input.light,
        borderWidth: 1,
        borderColor: ui.input.border,
      }}
    >
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(opt.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: isActive ? brandPrimary[600] : "transparent",
              borderLeftWidth: i > 0 ? 1 : 0,
              borderColor: ui.input.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Manrope_600SemiBold",
                color: isActive
                  ? "#fff"
                  : isDark
                    ? ui.text.mutedDark
                    : ui.text.muted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Mini stepper para series ─────────────────────────────────────────────────

function MiniStepper({ value, onChange, isDark }) {
  const canDecrease = value > 1;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isDark ? ui.input.dark : ui.input.light,
        borderWidth: 1,
        borderColor: ui.input.border,
      }}
    >
      <Pressable
        onPress={() => {
          if (!canDecrease) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value - 1);
        }}
        disabled={!canDecrease}
        hitSlop={4}
        style={{ opacity: canDecrease ? 1 : 0.3, width: 48, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_400Regular", color: isDark ? ui.text.mainDark : ui.text.main, lineHeight: 26 }}>
          −
        </Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: "center", borderLeftWidth: 1, borderRightWidth: 1, borderColor: ui.input.border, paddingVertical: 8 }}>
        <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: isDark ? ui.text.mainDark : ui.text.main }}>
          {value}
        </Text>
        <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: isDark ? ui.text.mutedDark : ui.text.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
          series
        </Text>
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value + 1);
        }}
        hitSlop={4}
        style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_400Regular", color: isDark ? ui.text.mainDark : ui.text.main, lineHeight: 26 }}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Input numérico compacto ──────────────────────────────────────────────────

function NumInput({ value, onChange, placeholder = "—", isDark, style }) {
  return (
    <BottomSheetTextInput
      value={value === null || value === undefined ? "" : String(value)}
      onChangeText={(t) => {
        if (t === "") { onChange(null); return; }
        const n = parseFloat(t);
        if (!isNaN(n)) onChange(n);
      }}
      placeholder={placeholder}
      placeholderTextColor={isDark ? ui.text.mutedDark : ui.text.muted}
      keyboardType="decimal-pad"
      style={{
        backgroundColor: isDark ? ui.input.dark : ui.input.light,
        color: isDark ? ui.text.mainDark : ui.text.main,
        padding: 10,
        borderRadius: 10,
        fontFamily: "Manrope_700Bold",
        fontSize: 16,
        borderWidth: 1,
        borderColor: ui.input.border,
        textAlign: "center",
        ...style,
      }}
    />
  );
}

// ─── Label de campo ───────────────────────────────────────────────────────────

function FieldLabel({ children, isDark }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontFamily: "Manrope_600SemiBold",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: isDark ? ui.text.mutedDark : ui.text.muted,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanDayExerciseCard({ exercise, onChange }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const isReps = (exercise.prescription_mode ?? "reps") === "reps";
  const hasIntensity = exercise.intensity_mode !== "none";

  return (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: ui.input.border,
        backgroundColor: isDark ? ui.surfaceSecondary.dark : ui.surfaceSecondary.light,
      }}
    >
      {/* Header con nombre del ejercicio */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
          borderBottomWidth: 1,
          borderBottomColor: ui.input.border,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            backgroundColor: `${brandPrimary[600]}1A`,
          }}
        >
          <Barbell size={16} color={brandPrimary[600]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: isDark ? ui.text.mainDark : ui.text.main,
            }}
          >
            {exercise.exercise_name}
          </Text>
          {!!exercise.exercise_muscle_group && (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Manrope_400Regular",
                color: isDark ? ui.text.mutedDark : ui.text.muted,
                marginTop: 1,
              }}
            >
              {exercise.exercise_muscle_group}
            </Text>
          )}
        </View>
      </View>

      {/* Campos de prescripción */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>

        {/* SERIES */}
        <View style={{ marginBottom: 14 }}>
          <FieldLabel isDark={isDark}>Series</FieldLabel>
          <MiniStepper
            value={exercise.sets ?? 4}
            onChange={(v) => onChange({ sets: v })}
            isDark={isDark}
          />
        </View>

        {/* TIPO DE PRESCRIPCIÓN */}
        <View style={{ marginBottom: 14 }}>
          <FieldLabel isDark={isDark}>Tipo</FieldLabel>
          <Seg
            options={[
              { label: "Repeticiones", value: "reps" },
              { label: "Duración", value: "duration" },
            ]}
            value={exercise.prescription_mode ?? "reps"}
            onChange={(v) => onChange({ prescription_mode: v })}
            isDark={isDark}
          />
        </View>

        {/* REPS (min–max) o DURACIÓN */}
        {isReps ? (
          <View style={{ marginBottom: 14 }}>
            <FieldLabel isDark={isDark}>Repeticiones</FieldLabel>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <NumInput
                value={exercise.reps_min}
                onChange={(v) => onChange({ reps_min: v })}
                placeholder="8"
                isDark={isDark}
                style={{ flex: 1 }}
              />
              <Text style={{ marginHorizontal: 10, fontFamily: "Manrope_400Regular", color: isDark ? ui.text.mutedDark : ui.text.muted }}>
                —
              </Text>
              <NumInput
                value={exercise.reps_max}
                onChange={(v) => onChange({ reps_max: v })}
                placeholder="12"
                isDark={isDark}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: 14 }}>
            <FieldLabel isDark={isDark}>Duración (segundos)</FieldLabel>
            <NumInput
              value={exercise.duration_seconds}
              onChange={(v) => onChange({ duration_seconds: v })}
              placeholder="30"
              isDark={isDark}
            />
          </View>
        )}

        {/* PESO + DESCANSO */}
        <View style={{ flexDirection: "row", marginBottom: 14 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <FieldLabel isDark={isDark}>Peso (kg)</FieldLabel>
            <NumInput
              value={exercise.weight_kg}
              onChange={(v) => onChange({ weight_kg: v })}
              placeholder="—"
              isDark={isDark}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FieldLabel isDark={isDark}>Descanso (seg)</FieldLabel>
            <NumInput
              value={exercise.rest_seconds}
              onChange={(v) => onChange({ rest_seconds: v })}
              placeholder="90"
              isDark={isDark}
            />
          </View>
        </View>

        {/* INTENSIDAD */}
        <View style={{ marginBottom: hasIntensity ? 8 : 14 }}>
          <FieldLabel isDark={isDark}>Intensidad</FieldLabel>
          <Seg
            options={[
              { label: "—", value: "none" },
              { label: "RIR", value: "rir" },
              { label: "RPE", value: "rpe" },
            ]}
            value={exercise.intensity_mode ?? "none"}
            onChange={(v) => onChange({ intensity_mode: v, rir: null, rpe: null })}
            isDark={isDark}
          />
        </View>
        {hasIntensity && (
          <View style={{ marginBottom: 14, alignItems: "flex-start" }}>
            <NumInput
              value={exercise.intensity_mode === "rir" ? exercise.rir : exercise.rpe}
              onChange={(v) =>
                exercise.intensity_mode === "rir"
                  ? onChange({ rir: v })
                  : onChange({ rpe: v })
              }
              placeholder={exercise.intensity_mode === "rir" ? "0 – 5" : "1 – 10"}
              isDark={isDark}
              style={{ minWidth: 100 }}
            />
          </View>
        )}

        {/* TEMPO */}
        <View style={{ marginBottom: 14 }}>
          <FieldLabel isDark={isDark}>Tempo (opcional)</FieldLabel>
          <BottomSheetTextInput
            value={exercise.tempo ?? ""}
            onChangeText={(t) => onChange({ tempo: t })}
            placeholder="3-1-1-0"
            placeholderTextColor={isDark ? ui.text.mutedDark : ui.text.muted}
            style={{
              backgroundColor: isDark ? ui.input.dark : ui.input.light,
              color: isDark ? ui.text.mainDark : ui.text.main,
              padding: 12,
              borderRadius: 10,
              fontFamily: "Manrope_400Regular",
              fontSize: 14,
              borderWidth: 1,
              borderColor: ui.input.border,
            }}
          />
        </View>

        {/* NOTAS */}
        <View>
          <FieldLabel isDark={isDark}>Notas del coach (opcional)</FieldLabel>
          <BottomSheetTextInput
            value={exercise.notes ?? ""}
            onChangeText={(t) => onChange({ notes: t })}
            placeholder="Indicaciones adicionales..."
            placeholderTextColor={isDark ? ui.text.mutedDark : ui.text.muted}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: isDark ? ui.input.dark : ui.input.light,
              color: isDark ? ui.text.mainDark : ui.text.main,
              padding: 12,
              borderRadius: 10,
              fontFamily: "Manrope_400Regular",
              fontSize: 14,
              borderWidth: 1,
              borderColor: ui.input.border,
              textAlignVertical: "top",
              minHeight: 72,
            }}
          />
        </View>
      </View>
    </View>
  );
}
