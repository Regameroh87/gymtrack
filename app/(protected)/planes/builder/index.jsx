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

import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { z } from "zod";

import { PLAN_OBJECTIVES } from "../../../../src/constants/planOptions";
import {
  resizeWeeksByDuration,
  resizeWeeksByWeeklyDays,
} from "../../../../src/hooks/useTrainingPlanForm";
import { usePlanFormContext } from "../../../../src/contexts/PlanFormContext";

import CustomSelect from "../../../../src/components/CustomSelect";
import FormField from "../../../../src/components/forms/FormField";
import Stepper from "../../../../src/components/Stepper";
import StyledTextInput from "../../../../src/components/forms/StyledTextInput";

import { brandPrimary, ui } from "../../../../src/theme/colors";
import { ChevronRight } from "../../../../assets/icons";

function getWeekSummary(week) {
  if (!week?.days?.length) return "Sin definir · Tocá para armar";
  const assigned = week.days.filter((d) => d.session_id).length;
  const total = week.days.length;
  if (assigned === 0) return "Sin definir · Tocá para armar";
  if (assigned < total) return `${assigned}/${total} días asignados`;
  return `${total} días asignados`;
}

function WeekCard({ weekNumber, label, summary, onPress, mutedColor }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 mb-2 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:scale-[0.98]"
    >
      <View className="w-11 h-11 rounded-lg items-center justify-center mr-3.5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <Text className="text-[9px] font-manrope-semi uppercase text-brandPrimary-500 dark:text-brandPrimary-400">
          {label ?? "Sem"}
        </Text>
        {!label && (
          <Text className="text-sm font-jakarta-bold leading-tight text-brandPrimary-600 dark:text-brandPrimary-400">
            {weekNumber}
          </Text>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
          {label ? "Semana tipo" : `Semana ${weekNumber}`}
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

export default function UserPlanBuilder() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const { form } = usePlanFormContext();

  const handleDurationChange = (newDuration) => {
    const currentWeeks = form.state.values.weeks ?? [];
    const weeklyDays = form.state.values.weekly_days ?? 3;
    const effectiveWeeks = newDuration === 0 ? 1 : newDuration;
    const newWeeks = resizeWeeksByDuration(currentWeeks, effectiveWeeks, weeklyDays);
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
      pathname: "/planes/builder/[week]",
      params: { week: String(weekNumber) },
    });
  };

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
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            {/* Header */}
            <View className="px-4 pt-6 pb-2">
              <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
                Nuevo Plan
              </Text>
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
                Armá tu rutina semanal personalizada.
              </Text>
            </View>

            <View className="px-4 pt-4">
              {/* ── NOMBRE ── */}
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
                  <FormField label="NOMBRE" error={field.state.meta.errors?.[0]}>
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

              {/* ── OBJETIVO ── */}
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

              {/* ── DURACIÓN ── */}
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

              {/* ── DÍAS SEMANALES ── */}
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

              {/* ── SEMANAS ── */}
              <form.Subscribe selector={(s) => [s.values.weeks ?? [], s.values.duration_weeks ?? 0]}>
                {([weeks, durationWeeks]) => (
                  <View className="mb-5 mt-2">
                    <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
                      RUTINA POR SEMANA
                    </Text>
                    {weeks.map((week) => (
                      <WeekCard
                        key={week.id}
                        weekNumber={week.week_number}
                        label={durationWeeks === 0 ? "Rep." : undefined}
                        summary={getWeekSummary(week)}
                        onPress={() => handleWeekPress(week.week_number)}
                        mutedColor={mutedColor}
                      />
                    ))}
                  </View>
                )}
              </form.Subscribe>

              {/* ── SUBMIT ── */}
              <form.Subscribe
                selector={(s) => ({ isDirty: s.isDirty, isSubmitting: s.isSubmitting })}
              >
                {({ isSubmitting }) => (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      form.handleSubmit();
                    }}
                    disabled={isSubmitting}
                    className="active:scale-[0.98] mt-2"
                  >
                    <LinearGradient
                      colors={[brandPrimary[600], brandPrimary[500]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="py-4 rounded-xl items-center"
                    >
                      <Text className="text-white font-jakarta-semi text-[15px]">
                        {isSubmitting ? "Guardando…" : "Crear plan"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </form.Subscribe>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
