// React
import { memo, useCallback } from "react";

// React Native
import { Pressable, Text, TextInput, View } from "react-native";

// Librerías externas
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

// Tema y assets
import { LinearGradient } from "expo-linear-gradient";
import { brandPrimary, gradient, ui } from "../../theme/colors";
import { getCloudinaryUrl, CLOUD_NAME } from "../../utils/cloudinary";
import { Barbell, GripVertical, Trash } from "../../../assets/icons";

const DEFAULT_SET = {
  weight_kg: null,
  reps_min: 8,
  reps_max: 12,
  duration_seconds: null,
  rest_seconds: 90,
};

// ─── SegmentedControl ─────────────────────────────────────────────────────────

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

// ─── Input numérico compacto ──────────────────────────────────────────────────

function NumInput({ value, onChange, placeholder = "—", isDark, style }) {
  return (
    <TextInput
      value={value === null || value === undefined ? "" : String(value)}
      onChangeText={(t) => {
        if (t === "") {
          onChange(null);
          return;
        }
        const n = parseFloat(t);
        if (!isNaN(n)) onChange(n);
      }}
      placeholder={placeholder}
      placeholderTextColor={isDark ? ui.text.mutedDark : ui.text.muted}
      keyboardType="decimal-pad"
      style={{
        backgroundColor: isDark ? ui.input.dark : ui.input.light,
        color: isDark ? ui.text.mainDark : ui.text.main,
        padding: 8,
        borderRadius: 8,
        fontFamily: "Manrope_700Bold",
        fontSize: 14,
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

// ─── Fila de una serie ────────────────────────────────────────────────────────

function SetRow({
  index,
  config,
  isReps,
  onChange,
  onRemove,
  canRemove,
  isDark,
}) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}
    >
      {/* Número de serie */}
      <View style={{ width: 22, alignItems: "center" }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Manrope_700Bold",
            color: isDark ? ui.text.mutedDark : ui.text.muted,
          }}
        >
          {index + 1}
        </Text>
      </View>

      {/* Peso */}
      <View style={{ flex: 1, marginHorizontal: 4 }}>
        <NumInput
          value={config.weight_kg}
          onChange={(v) => onChange({ weight_kg: v })}
          placeholder="—"
          isDark={isDark}
        />
      </View>

      {/* Reps min–max o Duración */}
      {isReps ? (
        <View className="flex-[2] flex-row items-center mx-1">
          <View className="flex-1">
            <NumInput
              value={config.reps_min}
              onChange={(v) => onChange({ reps_min: v })}
              placeholder="8"
              isDark={isDark}
            />
          </View>
          <Text
            style={{
              marginHorizontal: 3,
              fontFamily: "Manrope_400Regular",
              color: isDark ? ui.text.mutedDark : ui.text.muted,
              fontSize: 11,
            }}
          >
            –
          </Text>
          <View className="flex-1">
            <NumInput
              value={config.reps_max}
              onChange={(v) => onChange({ reps_max: v })}
              placeholder="12"
              isDark={isDark}
            />
          </View>
        </View>
      ) : (
        <View style={{ flex: 2, marginHorizontal: 4 }}>
          <NumInput
            value={config.duration_seconds}
            onChange={(v) => onChange({ duration_seconds: v })}
            placeholder="30"
            isDark={isDark}
          />
        </View>
      )}

      {/* Descanso */}
      <View style={{ flex: 1, marginLeft: 4 }}>
        <NumInput
          value={config.rest_seconds}
          onChange={(v) => onChange({ rest_seconds: v })}
          placeholder="90"
          isDark={isDark}
        />
      </View>

      {/* Eliminar serie */}
      <Pressable
        onPress={() => {
          if (!canRemove) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRemove();
        }}
        hitSlop={6}
        style={{
          marginLeft: 6,
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          opacity: canRemove ? 1 : 0,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: isDark ? ui.text.mutedDark : ui.text.muted,
            lineHeight: 16,
          }}
        >
          ×
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Acción de eliminar al hacer swipe ────────────────────────────────────────

function DeleteAction({ onDelete, isDark }) {
  return (
    <Pressable
      onPress={onDelete}
      style={{
        width: 80,
        marginBottom: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ui.error,
        marginLeft: 8,
      }}
    >
      <Trash size={18} color="#fff" />
      <Text
        style={{
          color: "#fff",
          fontSize: 10,
          fontFamily: "Manrope_600SemiBold",
          marginTop: 4,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        Eliminar
      </Text>
    </Pressable>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function PlanDayExerciseCard({ exercise, onChange, onDelete, drag, isActive }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const isReps = (exercise.prescription_mode ?? "reps") === "reps";
  const hasIntensity = exercise.intensity_mode !== "none";
  const exerciseImageUri = exercise.exercise_image_uri
    ? (getCloudinaryUrl(exercise.exercise_image_uri) ??
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${exercise.exercise_image_uri}`)
    : null;
  const setConfigs = exercise.set_configs ?? [{ ...DEFAULT_SET }];

  const updateSetConfig = (setIdx, updates) => {
    onChange({
      set_configs: setConfigs.map((c, i) =>
        i === setIdx ? { ...c, ...updates } : c
      ),
    });
  };

  const addSet = () => {
    const { id: _id, ...last } =
      setConfigs[setConfigs.length - 1] ?? DEFAULT_SET;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ set_configs: [...setConfigs, { ...last }] });
  };

  const removeSet = (setIdx) => {
    onChange({ set_configs: setConfigs.filter((_, i) => i !== setIdx) });
  };

  const renderRightActions = useCallback(
    () => <DeleteAction onDelete={onDelete} isDark={isDark} />,
    [onDelete, isDark]
  );

  // Vista colapsada mientras se arrastra: header compacto sin inputs para drag fluido.
  const cardContent = (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: isActive ? brandPrimary[500] : ui.input.border,
        backgroundColor: isDark
          ? ui.surfaceSecondary.dark
          : ui.surfaceSecondary.light,
        opacity: isActive ? 0.92 : 1,
      }}
    >
      {/* Header con nombre del ejercicio y conteo de series */}
      <LinearGradient
        colors={
          isDark ? gradient.exerciseHeader.dark : gradient.exerciseHeader.light
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: isActive ? 0 : 1,
          borderBottomColor: ui.input.border,
        }}
      >
        {exerciseImageUri ? (
          <Image
            source={{ uri: exerciseImageUri }}
            contentFit="cover"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              backgroundColor: "rgba(255,255,255,0.20)",
            }}
          >
            <Barbell size={18} color={brandPrimary[600]} />
          </View>
        )}
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
        <View style={{ alignItems: "center", paddingLeft: 12 }}>
          <Text
            style={{
              fontSize: 22,
              fontFamily: "PlusJakartaSans_700Bold",
              color: "#ffffff",
              lineHeight: 24,
            }}
          >
            {setConfigs.length}
          </Text>
          <Text
            style={{
              fontSize: 9,
              fontFamily: "Manrope_600SemiBold",
              color: "rgba(255,255,255,0.65)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            series
          </Text>
        </View>
        {/* Grip handle: solo visible en modo edición con drag habilitado */}
        {!!drag && (
          <Pressable
            onLongPress={drag}
            delayLongPress={200}
            hitSlop={8}
            style={{
              marginLeft: 10,
              padding: 6,
              opacity: 0.5,
            }}
          >
            <GripVertical size={18} color="#ffffff" />
          </Pressable>
        )}
      </LinearGradient>

      {/* Cuerpo — oculto mientras se arrastra para mantener el drag fluido */}
      {!isActive && (
      <View
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}
      >
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

        {/* TABLA DE SERIES */}
        <View style={{ marginBottom: 14 }}>
          {/* Encabezado de columnas */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View style={{ width: 22 }} />
            <Text
              style={{
                flex: 1,
                fontSize: 9,
                fontFamily: "Manrope_600SemiBold",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: isDark ? ui.text.mutedDark : ui.text.muted,
                textAlign: "center",
                marginHorizontal: 4,
              }}
            >
              KG
            </Text>
            <Text
              style={{
                flex: 2,
                fontSize: 9,
                fontFamily: "Manrope_600SemiBold",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: isDark ? ui.text.mutedDark : ui.text.muted,
                textAlign: "center",
                marginHorizontal: 4,
              }}
            >
              {isReps ? "REPS" : "SEG"}
            </Text>
            <Text
              style={{
                flex: 1,
                fontSize: 9,
                fontFamily: "Manrope_600SemiBold",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: isDark ? ui.text.mutedDark : ui.text.muted,
                textAlign: "center",
                marginLeft: 4,
              }}
            >
              DESC (s)
            </Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Filas por serie */}
          {setConfigs.map((config, setIdx) => (
            <SetRow
              key={setIdx}
              index={setIdx}
              config={config}
              isReps={isReps}
              onChange={(updates) => updateSetConfig(setIdx, updates)}
              onRemove={() => removeSet(setIdx)}
              canRemove={setConfigs.length > 1}
              isDark={isDark}
            />
          ))}

          {/* Agregar serie */}
          <Pressable
            onPress={addSet}
            style={{
              marginTop: 8,
              paddingVertical: 9,
              borderRadius: 10,
              alignItems: "center",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: `${brandPrimary[600]}60`,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Manrope_600SemiBold",
                color: brandPrimary[600],
              }}
            >
              + Agregar serie
            </Text>
          </Pressable>
        </View>

        {/* INTENSIDAD — solo visible en modo repeticiones */}
        {isReps && (
          <>
            <View style={{ marginBottom: hasIntensity ? 8 : 14 }}>
              <FieldLabel isDark={isDark}>Intensidad</FieldLabel>
              <Seg
                options={[
                  { label: "—", value: "none" },
                  { label: "RIR", value: "rir" },
                  { label: "RPE", value: "rpe" },
                ]}
                value={exercise.intensity_mode ?? "none"}
                onChange={(v) =>
                  onChange({ intensity_mode: v, rir: null, rpe: null })
                }
                isDark={isDark}
              />
            </View>
            {hasIntensity && (
              <View style={{ marginBottom: 14, alignItems: "flex-start" }}>
                <NumInput
                  value={
                    exercise.intensity_mode === "rir"
                      ? exercise.rir
                      : exercise.rpe
                  }
                  onChange={(v) =>
                    exercise.intensity_mode === "rir"
                      ? onChange({ rir: v })
                      : onChange({ rpe: v })
                  }
                  placeholder={
                    exercise.intensity_mode === "rir" ? "0 – 5" : "1 – 10"
                  }
                  isDark={isDark}
                  style={{ minWidth: 100 }}
                />
              </View>
            )}
          </>
        )}

        {/* TEMPO — solo visible en modo repeticiones */}
        {isReps && (
          <View style={{ marginBottom: 14 }}>
            <FieldLabel isDark={isDark}>Tempo (opcional)</FieldLabel>
            <TextInput
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
        )}

        {/* NOTAS */}
        <View>
          <FieldLabel isDark={isDark}>Notas del coach (opcional)</FieldLabel>
          <TextInput
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
      )}
    </View>
  );

  if (onDelete) {
    return (
      <ReanimatedSwipeable
        renderRightActions={renderRightActions}
        rightThreshold={60}
        overshootRight={false}
      >
        {cardContent}
      </ReanimatedSwipeable>
    );
  }

  return cardContent;
}

export default memo(PlanDayExerciseCard);
