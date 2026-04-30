import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  NestableScrollContainer,
  NestableDraggableFlatList,
} from "react-native-draggable-flatlist";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { database } from "../../database";
import { exercises_base } from "../../database/schemas";
import useAsyncStorage from "../../hooks/useAsyncStorage";
import {
  ROUTINE_OBJECTIVES,
  ROUTINE_LEVELS,
  ROUTINE_STATUSES,
} from "../../constants/routineOptions";
import CustomSelect from "../CustomSelect";
import FormField from "./FormField";
import StyledTextInput from "./StyledTextInput";
import ImagePickerCard from "./ImagePickerCard";
import SubmitButton from "./SubmitButton";
import RoutineExerciseCard from "./RoutineExerciseCard";
import { ui } from "../../theme/colors";
import { Plus } from "../../../assets/icons";
import { useColorScheme } from "nativewind";

// ── Segmented control used for status ────────────────────────────────────────
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

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
      {children}
    </Text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FormRoutine({ form, routine }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const { data: dbExercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const results = await database
        .select({
          id: exercises_base.id,
          name: exercises_base.name,
          muscle_group: exercises_base.muscle_group,
          image_uri: exercises_base.image_uri,
          sync_status: exercises_base.sync_status,
        })
        .from(exercises_base)
        .orderBy(exercises_base.name);
      return (results || []).filter((e) => e.sync_status !== "deleted");
    },
    staleTime: Infinity,
  });

  useAsyncStorage({
    form,
    storageKey: "addRoutineDraft",
    enabled: !routine,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <NestableScrollContainer
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
      {/* ── Header ── */}
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
          Armar Rutina
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
          Creá una plantilla de entrenamiento reutilizable.
        </Text>
      </View>

      <View className="px-4 pt-4 pb-10">
        {/* ─────────────── SECCIÓN A: INFORMACIÓN GENERAL ─────────────── */}
        <View className="mb-8">
          <SectionLabel>1 · Información General</SectionLabel>

          {/* Nombre */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined;
                const r = z
                  .string()
                  .min(3, "Mínimo 3 caracteres")
                  .safeParse(value);
                return r.success ? undefined : r.error.errors[0].message;
              },
              onSubmit: ({ value }) => {
                if (!value?.trim()) return "El nombre es requerido";
                if (value.trim().length < 3) return "Mínimo 3 caracteres";
                return undefined;
              },
            }}
          >
            {(field) => (
              <FormField
                label="NOMBRE DE LA RUTINA"
                error={field.state.meta.errors?.[0]}
              >
                <StyledTextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: Full Body Fuerza A"
                  placeholderTextColor={mutedColor}
                  error={field.state.meta.errors?.length > 0}
                  returnKeyType="next"
                />
              </FormField>
            )}
          </form.Field>

          {/* Descripción */}
          <form.Field name="description">
            {(field) => (
              <FormField label="DESCRIPCIÓN">
                <TextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Filosofía de la rutina, cómo progresar, notas generales..."
                  placeholderTextColor={mutedColor}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope text-sm"
                  style={{ minHeight: 90 }}
                />
              </FormField>
            )}
          </form.Field>

          {/* Objetivo */}
          <form.Field
            name="objective"
            validators={{
              onSubmit: ({ value }) =>
                !value ? "Seleccioná un objetivo" : undefined,
            }}
          >
            {(field) => (
              <CustomSelect
                label="OBJETIVO"
                options={ROUTINE_OBJECTIVES}
                value={field.state.value}
                onChange={field.handleChange}
                placeholder="Seleccionar objetivo..."
                error={field.state.meta.errors?.[0]}
                searchable={false}
                snapPoints={["50%"]}
              />
            )}
          </form.Field>

          {/* Nivel */}
          <form.Field
            name="level"
            validators={{
              onSubmit: ({ value }) =>
                !value ? "Seleccioná un nivel" : undefined,
            }}
          >
            {(field) => (
              <CustomSelect
                label="NIVEL"
                options={ROUTINE_LEVELS}
                value={field.state.value}
                onChange={field.handleChange}
                placeholder="Seleccionar nivel..."
                error={field.state.meta.errors?.[0]}
                searchable={false}
                snapPoints={["40%"]}
              />
            )}
          </form.Field>

          {/* Duración estimada */}
          <form.Field
            name="estimated_duration_min"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined;
                const n = Number(value);
                if (isNaN(n) || n < 10 || n > 180)
                  return "Ingresá entre 10 y 180 minutos";
                return undefined;
              },
            }}
          >
            {(field) => (
              <FormField
                label="DURACIÓN ESTIMADA POR SESIÓN (MIN)"
                error={field.state.meta.errors?.[0]}
              >
                <StyledTextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="60"
                  placeholderTextColor={mutedColor}
                  keyboardType="number-pad"
                  error={field.state.meta.errors?.length > 0}
                />
              </FormField>
            )}
          </form.Field>

          {/* Estado */}
          <form.Field name="status">
            {(field) => (
              <FormField label="ESTADO">
                <SegmentedControl
                  options={ROUTINE_STATUSES}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              </FormField>
            )}
          </form.Field>

          {/* Imagen de portada */}
          <form.Field name="cover_image_uri">
            {(field) => (
              <ImagePickerCard
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </View>

        {/* ─────────────── SECCIÓN B: EJERCICIOS ─────────────── */}
        <form.Field
          name="exercises"
          validators={{
            onSubmit: ({ value }) =>
              !value?.length ? "Agregá al menos un ejercicio" : undefined,
          }}
        >
          {(field) => (
            <View className="mb-8">
              <SectionLabel>
                2 · Ejercicios · {field.state.value.length}
              </SectionLabel>

              {field.state.meta.errors?.[0] && (
                <Text className="text-red-500 dark:text-red-400 text-[11px] mb-3 font-manrope-semi italic">
                  {field.state.meta.errors[0]}
                </Text>
              )}

              <CustomSelect
                placeholder="Buscar y agregar ejercicio..."
                options={dbExercises
                  .filter(
                    (e) =>
                      !field.state.value.find((v) => v.exercise_id === e.id)
                  )
                  .map((e) => ({ label: e.name, value: e.id }))}
                value=""
                searchable
                onChange={(exerciseId) => {
                  if (!exerciseId) return;
                  const ex = dbExercises.find((e) => e.id === exerciseId);
                  if (!ex) return;
                  const newEntry = {
                    id: Crypto.randomUUID(),
                    exercise_id: ex.id,
                    name: ex.name,
                    muscle_group: ex.muscle_group,
                    image_uri: ex.image_uri,
                    position: field.state.value.length,
                    sets: "3",
                    prescription_mode: "reps",
                    reps_min: "8",
                    reps_max: "12",
                    duration_seconds: "",
                    weight_kg: "",
                    rest_seconds: "60",
                    intensity_mode: "none",
                    rir: "",
                    rpe: "",
                    tempo: "",
                    notes: "",
                  };
                  field.handleChange([...field.state.value, newEntry]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />

              <NestableDraggableFlatList
                data={field.state.value}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => field.handleChange(data)}
                activationDistance={8}
                renderItem={({ item, drag, isActive, getIndex }) => (
                  <RoutineExerciseCard
                    exercise={item}
                    drag={drag}
                    isActive={isActive}
                    onChange={(fieldName, value) => {
                      const idx = getIndex();
                      const newList = [...field.state.value];
                      newList[idx] = { ...newList[idx], [fieldName]: value };
                      field.handleChange(newList);
                    }}
                    onDelete={() => {
                      const idx = getIndex();
                      field.handleChange(
                        field.state.value.filter((_, i) => i !== idx)
                      );
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  />
                )}
              />

              {field.state.value.length === 0 && (
                <View className="py-10 items-center justify-center rounded-xl border border-dashed border-ui-input-border">
                  <Plus size={28} color={mutedColor} />
                  <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-2 text-center px-6">
                    Buscá y agregá ejercicios del catálogo
                  </Text>
                </View>
              )}
            </View>
          )}
        </form.Field>

        {/* ─────────────── SUBMIT ─────────────── */}
        <SubmitButton
          onPress={() => form.handleSubmit()}
          label="Guardar Rutina"
          isLoading={form.state.isSubmitting}
        />
      </View>
      </NestableScrollContainer>
    </KeyboardAvoidingView>
  );
}
