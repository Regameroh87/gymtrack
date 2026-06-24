// React Native
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { z } from "zod";

// Constantes
import { PLAN_LEVELS, PLAN_OBJECTIVES } from "../../constants/planOptions";
import { PLAN_TARGET_GENDERS } from "../../constants/gender-options";

// Hooks
import {
  resizeWeeksByDuration,
  resizeWeeksByWeeklyDays,
} from "../../hooks/plans/use-training-plan-form";

// Componentes
import CustomSelect from "../CustomSelect";
import FormField from "./FormField";
import FormsHeader from "../FormsHeader";
import ImagePickerCard from "./ImagePickerCard";
import Stepper from "../Stepper";
import StyledTextInput from "./StyledTextInput";
import SubmitButton from "./SubmitButton";

// Tema y assets
import { ui } from "@gymtrack/core/colors";
import { ChevronRight } from "../../../assets/icons";

// ─── Tarjeta de semana ──────────────────────────────────────────────────────

function getWeekSummary(week) {
  if (!week || !week.days?.length) return "Sin definir · Tocá para armar";
  const assigned = week.days.filter((d) => d.session_id).length;
  const total = week.days.length;
  if (assigned === 0) return "Sin definir · Tocá para armar";
  if (assigned < total) return `${assigned}/${total} días asignados`;
  return `${total} días asignados`;
}

function WeekCard({ weekNumber, summary, onPress, mutedColor, isTemplate }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 mb-2 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:scale-[0.98]"
    >
      <View className="w-11 h-11 rounded-lg items-center justify-center mr-3.5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        {isTemplate ? (
          <Text className="text-[9px] font-manrope-semi uppercase text-brandPrimary-500 dark:text-brandPrimary-400 text-center leading-tight">
            Rep.
          </Text>
        ) : (
          <>
            <Text className="text-[9px] font-manrope-semi uppercase text-brandPrimary-500 dark:text-brandPrimary-400">
              Sem
            </Text>
            <Text className="text-sm font-jakarta-bold leading-tight text-brandPrimary-600 dark:text-brandPrimary-400">
              {weekNumber}
            </Text>
          </>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
          {isTemplate ? "Semana tipo" : `Semana ${weekNumber}`}
        </Text>
        <Text
          className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5"
          numberOfLines={1}
        >
          {summary}
        </Text>
      </View>

      <ChevronRight size={14} color={mutedColor} />
    </Pressable>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function FormTrainingPlan({
  form,
  plan,
  simplified = false,
  weekPathname = "/admin/plans/builder/[week]",
}) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const handleDurationChange = (newDuration) => {
    const currentWeeks = form.state.values.weeks ?? [];
    const weeklyDays = form.state.values.weekly_days ?? 3;
    const effectiveWeeks = newDuration === 0 ? 1 : newDuration;
    const newWeeks = resizeWeeksByDuration(
      currentWeeks,
      effectiveWeeks,
      weeklyDays
    );
    form.setFieldValue("duration_weeks", newDuration);
    form.setFieldValue("weeks", newWeeks);
  };

  const handleWeeklyDaysChange = (newCount) => {
    const currentWeeks = form.state.values.weeks ?? [];
    const newWeeks = resizeWeeksByWeeklyDays(currentWeeks, newCount);
    form.setFieldValue("weekly_days", newCount);
    form.setFieldValue("weeks", newWeeks);
  };

  const handleWeekPress = (weekNumber) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: weekPathname,
      params: { week: String(weekNumber), id: plan ?? "" },
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <FormsHeader
              title={plan ? "Editar Plan" : "Nuevo Plan"}
              subtitle="Definí los datos del plan y la rutina de cada semana."
            />

            <View className="px-4 pt-4">
              {/* ─── PORTADA ─── */}
              {!simplified && (
                <form.Field name="cover_image_uri">
                  {(field) => (
                    <ImagePickerCard
                      value={field.state.value}
                      onChange={field.handleChange}
                      onFocus={field.handleBlur}
                      title="Imagen de portada"
                      hint="Una buena portada ayuda a identificar el plan rápidamente."
                    />
                  )}
                </form.Field>
              )}

              {/* ─── NOMBRE ─── */}
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
                    label="NOMBRE"
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

              {/* ─── OBJETIVO ─── */}
              {!simplified && (
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
              )}

              {/* ─── DESCRIPCIÓN ─── */}
              {!simplified && (
                <form.Field name="description">
                  {(field) => (
                    <FormField label="DESCRIPCIÓN (opcional)">
                      <StyledTextInput
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        placeholder="Enfoque del plan, a quién está dirigido, metodología..."
                        placeholderTextColor={mutedColor}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{ minHeight: 100 }}
                      />
                    </FormField>
                  )}
                </form.Field>
              )}

              {/* ─── DURACIÓN ─── */}
              <form.Field name="duration_weeks">
                {(field) => (
                  <FormField label="DURACIÓN DEL PLAN">
                    <Stepper
                      value={field.state.value ?? 0}
                      onChange={handleDurationChange}
                      min={0}
                      max={null}
                      unit="semanas"
                      zeroLabel="Indefinido"
                    />
                  </FormField>
                )}
              </form.Field>

              {/* ─── DÍAS SEMANALES ─── */}
              <form.Field name="weekly_days">
                {(field) => (
                  <FormField label="DÍAS DE ENTRENAMIENTO POR SEMANA">
                    <Stepper
                      value={field.state.value ?? 3}
                      onChange={handleWeeklyDaysChange}
                      min={2}
                      max={7}
                      unit="días"
                    />
                  </FormField>
                )}
              </form.Field>

              {/* ─── NIVEL ─── */}
              {!simplified && (
                <form.Field name="level">
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
              )}

              {/* ─── DIRIGIDO A ─── */}
              {!simplified && (
                <form.Field name="target_gender">
                  {(field) => (
                    <CustomSelect
                      label="DIRIGIDO A"
                      options={PLAN_TARGET_GENDERS}
                      value={field.state.value}
                      onChange={field.handleChange}
                      placeholder="Seleccionar público..."
                      error={field.state.meta.errors?.[0]}
                      searchable={false}
                      snapPoints={["40%"]}
                    />
                  )}
                </form.Field>
              )}

              {/* ─── SEMANAS ─── */}
              <form.Subscribe
                selector={(s) => ({
                  weeks: s.values.weeks ?? [],
                  durationWeeks: s.values.duration_weeks ?? 0,
                })}
              >
                {({ weeks, durationWeeks }) => (
                  <View className="mb-5 mt-2">
                    <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
                      {durationWeeks === 0
                        ? "SEMANA TIPO"
                        : "RUTINA POR SEMANA"}
                    </Text>
                    {weeks.map((week) => (
                      <WeekCard
                        key={week.id}
                        weekNumber={week.week_number}
                        summary={getWeekSummary(week)}
                        onPress={() => handleWeekPress(week.week_number)}
                        mutedColor={mutedColor}
                        isTemplate={durationWeeks === 0}
                      />
                    ))}
                  </View>
                )}
              </form.Subscribe>

              {/* ─── ERROR DE VALIDACIÓN A NIVEL FORM ─── */}
              <form.Subscribe selector={(s) => s.errorMap?.onSubmit}>
                {(formError) =>
                  formError ? (
                    <Text className="text-red-500 dark:text-red-400 text-sm text-center font-manrope-semi mt-4 -mb-2">
                      {formError}
                    </Text>
                  ) : null
                }
              </form.Subscribe>

              {/* ─── SUBMIT ─── */}
              <form.Subscribe
                selector={(s) => ({
                  isDirty: s.isDirty,
                  isSubmitting: s.isSubmitting,
                })}
              >
                {({ isDirty, isSubmitting }) => (
                  <SubmitButton
                    onPress={() => form.handleSubmit()}
                    isLoading={isSubmitting}
                    disabled={!!plan && !isDirty}
                    label={plan ? "Guardar cambios" : "Crear plan"}
                  />
                )}
              </form.Subscribe>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
