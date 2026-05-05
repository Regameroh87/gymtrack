// React Native
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

// Librerías externas
import { useQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { z } from "zod";

// Base de datos
import { database } from "../../database";
import { sessions } from "../../database/schemas";

// Constantes
import { PLAN_LEVELS, PLAN_OBJECTIVES, PLAN_STATUSES } from "../../constants/planOptions";

// Componentes
import CustomSelect from "../CustomSelect";
import FormField from "./FormField";
import ImagePickerCard from "./ImagePickerCard";
import StyledTextInput from "./StyledTextInput";
import SubmitButton from "./SubmitButton";
import TrainingPlanDayCard from "./TrainingPlanDayCard";

// Tema y assets
import { Plus } from "../../../assets/icons";
import { ui } from "../../theme/colors";

function SectionLabel({ children }) {
  return (
    <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
      {children}
    </Text>
  );
}

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

export default function FormTrainingPlan({ form, plan }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const { data: dbRoutines = [] } = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const results = await database
        .select({
          id: sessions.id,
          name: sessions.name,
          sync_status: sessions.sync_status,
        })
        .from(sessions)
        .orderBy(sessions.name);
      return (results || []).filter((r) => r.sync_status !== "deleted");
    },
    staleTime: Infinity,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View className="px-4 pt-6 pb-2">
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            {plan ? "Editar Plan" : "Armar Plan"}
          </Text>
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
            {plan
              ? "Modificá los días y guardá los cambios."
              : "Definí los días de entrenamiento y qué rutina hacés cada uno."}
          </Text>
        </View>

        <View className="px-4 pt-4 pb-10">
          {/* ─────────────── SECCIÓN 1: INFORMACIÓN GENERAL ─────────────── */}
          <View className="mb-8">
            <SectionLabel>1 · Información General</SectionLabel>

            {/* Nombre */}
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  const r = z.string().min(3, "Mínimo 3 caracteres").safeParse(value);
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
                  label="NOMBRE DEL PLAN"
                  error={field.state.meta.errors?.[0]}
                >
                  <StyledTextInput
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    placeholder="Ej: PPL · Frecuencia 2"
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
                    placeholder="Objetivos del plan, cómo progresar, notas generales..."
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
                  options={PLAN_OBJECTIVES}
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
                  options={PLAN_LEVELS}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder="Seleccionar nivel..."
                  error={field.state.meta.errors?.[0]}
                  searchable={false}
                  snapPoints={["40%"]}
                />
              )}
            </form.Field>

            {/* Estado */}
            <form.Field name="status">
              {(field) => (
                <FormField label="ESTADO">
                  <SegmentedControl
                    options={PLAN_STATUSES}
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

          {/* ─────────────── SECCIÓN 2: DÍAS ─────────────── */}
          <form.Field
            name="days"
            validators={{
              onSubmit: ({ value }) =>
                !value?.length ? "Agregá al menos un día" : undefined,
            }}
          >
            {(field) => {
              const days = field.state.value;

              // Resumen de frecuencia: agrupa por routine_id (cálculo inline — lista siempre pequeña)
              const frequencyCounts = {};
              for (const day of days) {
                if (!frequencyCounts[day.routine_id]) {
                  frequencyCounts[day.routine_id] = {
                    name: day.routine_name,
                    count: 0,
                  };
                }
                frequencyCounts[day.routine_id].count++;
              }
              const frequencySummary = Object.values(frequencyCounts);

              return (
                <View className="mb-8">
                  <SectionLabel>2 · Días · {days.length}</SectionLabel>

                  {field.state.meta.errors?.[0] && (
                    <Text className="text-red-500 dark:text-red-400 text-[11px] mb-3 font-manrope-semi italic">
                      {field.state.meta.errors[0]}
                    </Text>
                  )}

                  {/* Selector de rutina para agregar día */}
                  <CustomSelect
                    placeholder="Agregar día → buscar rutina..."
                    options={dbRoutines.map((r) => ({ label: r.name, value: r.id, meta: r }))}
                    value=""
                    searchable
                    onChange={(routineId) => {
                      if (!routineId) return;
                      const routine = dbRoutines.find((r) => r.id === routineId);
                      if (!routine) return;
                      const newDay = {
                        id: Crypto.randomUUID(),
                        routine_id: routine.id,
                        routine_name: routine.name,
                      };
                      field.handleChange([...days, newDay]);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />

                  {/* Lista de días */}
                  {days.map((day, idx) => (
                    <TrainingPlanDayCard
                      key={day.id}
                      day={day}
                      dayNumber={idx + 1}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < days.length - 1}
                      onMoveUp={() => {
                        const list = [...days];
                        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                        field.handleChange(list);
                      }}
                      onMoveDown={() => {
                        const list = [...days];
                        [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                        field.handleChange(list);
                      }}
                      onDelete={() => {
                        field.handleChange(days.filter((_, i) => i !== idx));
                      }}
                    />
                  ))}

                  {/* Empty state */}
                  {days.length === 0 && (
                    <View className="py-10 items-center justify-center rounded-xl border border-dashed border-ui-input-border">
                      <Plus size={28} color={mutedColor} />
                      <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-2 text-center px-6">
                        Buscá y agregá rutinas para cada día del plan
                      </Text>
                    </View>
                  )}

                  {/* Resumen de frecuencia */}
                  {frequencySummary.length > 0 && (
                    <View className="mt-4">
                      <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-2 text-ui-text-muted dark:text-ui-text-mutedDark">
                        Frecuencia
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {frequencySummary.map((item) => (
                          <View
                            key={item.name}
                            className="flex-row items-center rounded-full px-3 py-1"
                            style={{ backgroundColor: "#4A44E422" }}
                          >
                            <Text
                              className="text-[11px] font-manrope-semi"
                              style={{ color: "#4A44E4" }}
                            >
                              {item.name}
                              {item.count > 1 ? ` ×${item.count}` : ""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
          </form.Field>

          {/* ─────────────── SUBMIT ─────────────── */}
          <SubmitButton
            onPress={() => form.handleSubmit()}
            label="Guardar Plan"
            isLoading={form.state.isSubmitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
