import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Barbell, Trash, ChevronRight } from "../../../assets/icons";
import { brandPrimary, ui } from "../../theme/colors";
import { useColorScheme } from "nativewind";
import { getCloudinaryUrl } from "../../utils/cloudinary";
import FormField from "./FormField";
import StyledTextInput from "./StyledTextInput";

// ── Inline segmented control ──────────────────────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <View className="flex-row bg-ui-input-light dark:bg-ui-input-dark rounded-xl p-1 gap-1">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={`flex-1 items-center py-2 rounded-lg ${
            value === opt.value ? "bg-brandPrimary-600" : ""
          }`}
        >
          <Text
            className={`text-xs font-manrope-semi ${
              value === opt.value
                ? "text-white"
                : "text-ui-text-muted dark:text-ui-text-mutedDark"
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Summary string for collapsed header ──────────────────────────────────────
function getSummary(ex) {
  const sets = ex.sets || "–";
  let prescription;
  if (ex.prescription_mode === "duration") {
    prescription = ex.duration_seconds ? `${ex.duration_seconds}seg` : "–seg";
  } else {
    const min = ex.reps_min || "–";
    const max = ex.reps_max ? `‑${ex.reps_max}` : "";
    prescription = `${min}${max}`;
  }
  const weight = ex.weight_kg ? ` · ${ex.weight_kg}kg` : "";
  const rest = ex.rest_seconds ? ` · ${ex.rest_seconds}s` : "";
  return `${sets} × ${prescription}${weight}${rest}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoutineExerciseCard({
  exercise,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const imageUri = getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri;
  const set = (field, value) => onChange(field, value);

  const disabledColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  return (
    <View className="mb-2.5 border border-ui-input-border rounded-xl overflow-hidden bg-ui-surface-light dark:bg-ui-surface-dark">
      {/* ── Header (always visible) ── */}
      <Pressable
        onPress={() => {
          setIsExpanded((prev) => !prev);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        className="flex-row items-center p-3 active:opacity-70"
      >
        <View className="pr-2 -ml-1 justify-center">
          <Pressable
            onPress={onMoveUp}
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
            onPress={onMoveDown}
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

        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-10 h-10 rounded-lg items-center justify-center mr-2.5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
            <Barbell size={18} color={brandPrimary[600]} />
          </View>
        )}

        <View className="flex-1">
          <Text
            className="font-jakarta-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
            {getSummary(exercise)}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          className="p-2 mr-1"
          hitSlop={8}
        >
          <Trash size={15} color="#ef4444" />
        </Pressable>

        <ChevronRight
          size={16}
          color={mutedColor}
          style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}
        />
      </Pressable>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <View className="px-3 pb-4 pt-1 border-t border-ui-input-border">
          {/* Series */}
          <FormField label="SERIES">
            <StyledTextInput
              value={exercise.sets}
              onChangeText={(v) => set("sets", v)}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={mutedColor}
            />
          </FormField>

          {/* Prescription mode */}
          <FormField label="TIPO DE PRESCRIPCIÓN">
            <SegmentedControl
              options={[
                { label: "Repeticiones", value: "reps" },
                { label: "Duración", value: "duration" },
              ]}
              value={exercise.prescription_mode}
              onChange={(v) => set("prescription_mode", v)}
            />
          </FormField>

          {exercise.prescription_mode === "reps" ? (
            <View className="flex-row gap-x-3">
              <View className="flex-1">
                <FormField label="REPS MÍN">
                  <StyledTextInput
                    value={exercise.reps_min}
                    onChangeText={(v) => set("reps_min", v)}
                    keyboardType="number-pad"
                    placeholder="8"
                    placeholderTextColor={mutedColor}
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="REPS MÁX">
                  <StyledTextInput
                    value={exercise.reps_max}
                    onChangeText={(v) => set("reps_max", v)}
                    keyboardType="number-pad"
                    placeholder="12"
                    placeholderTextColor={mutedColor}
                  />
                </FormField>
              </View>
            </View>
          ) : (
            <FormField label="DURACIÓN (SEG)">
              <StyledTextInput
                value={exercise.duration_seconds}
                onChangeText={(v) => set("duration_seconds", v)}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={mutedColor}
              />
            </FormField>
          )}

          <View className="flex-row gap-x-3">
            <View className="flex-1">
              <FormField label="PESO (KG)">
                <StyledTextInput
                  value={exercise.weight_kg}
                  onChangeText={(v) => set("weight_kg", v)}
                  keyboardType="decimal-pad"
                  placeholder="–"
                  placeholderTextColor={mutedColor}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label="DESCANSO (SEG)">
                <StyledTextInput
                  value={exercise.rest_seconds}
                  onChangeText={(v) => set("rest_seconds", v)}
                  keyboardType="number-pad"
                  placeholder="60"
                  placeholderTextColor={mutedColor}
                />
              </FormField>
            </View>
          </View>

          {/* Intensity mode */}
          <FormField label="INTENSIDAD">
            <SegmentedControl
              options={[
                { label: "—", value: "none" },
                { label: "RIR", value: "rir" },
                { label: "RPE", value: "rpe" },
              ]}
              value={exercise.intensity_mode}
              onChange={(v) => set("intensity_mode", v)}
            />
          </FormField>

          {exercise.intensity_mode === "rir" && (
            <FormField label="REPS IN RESERVE (0‑5)">
              <StyledTextInput
                value={exercise.rir}
                onChangeText={(v) => set("rir", v)}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={mutedColor}
              />
            </FormField>
          )}

          {exercise.intensity_mode === "rpe" && (
            <FormField label="RPE (1‑10)">
              <StyledTextInput
                value={exercise.rpe}
                onChangeText={(v) => set("rpe", v)}
                keyboardType="decimal-pad"
                placeholder="8"
                placeholderTextColor={mutedColor}
              />
            </FormField>
          )}

          <FormField label="TEMPO (EJ: 3‑1‑1‑0)">
            <StyledTextInput
              value={exercise.tempo}
              onChangeText={(v) => set("tempo", v)}
              placeholder="3-1-1-0"
              autoCapitalize="none"
              placeholderTextColor={mutedColor}
            />
          </FormField>

          <FormField label="NOTAS DEL COACH" className="mb-0">
            <TextInput
              value={exercise.notes}
              onChangeText={(v) => set("notes", v)}
              placeholder="Instrucciones específicas para este ejercicio..."
              placeholderTextColor={mutedColor}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope text-sm"
              style={{ minHeight: 80 }}
            />
          </FormField>
        </View>
      )}
    </View>
  );
}
