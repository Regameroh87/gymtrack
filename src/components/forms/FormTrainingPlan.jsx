// React Native
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// React
import { useCallback, useMemo, useRef, useState } from "react";

// Librerías externas
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { z } from "zod";

// Hooks
import { useSessions } from "../../hooks/useSessions";

// Constantes
import { PLAN_OBJECTIVES } from "../../constants/planOptions";

// Componentes
import CustomSelect from "../CustomSelect";
import FormField from "./FormField";
import StyledTextInput from "./StyledTextInput";
import SubmitButton from "./SubmitButton";

// Tema y assets
import { brandPrimary, ui } from "../../theme/colors";
import { ChevronRight, X } from "../../../assets/icons";

function SectionLabel({ children }) {
  return (
    <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
      {children}
    </Text>
  );
}

function DayStepper({ value, onChange }) {
  const canDecrease = value > 2;
  const canIncrease = value < 7;

  return (
    <View className="flex-row items-center bg-ui-input-light dark:bg-ui-input-dark rounded-xl border border-ui-input-border overflow-hidden">
      <Pressable
        onPress={() => {
          if (!canDecrease) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value - 1);
        }}
        disabled={!canDecrease}
        hitSlop={4}
        className="w-14 h-14 items-center justify-center active:opacity-50"
        style={{ opacity: canDecrease ? 1 : 0.3 }}
      >
        <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark leading-none">
          −
        </Text>
      </Pressable>

      <View className="flex-1 items-center py-2 border-x border-ui-input-border">
        <Text className="text-3xl font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark leading-tight">
          {value}
        </Text>
        <Text className="text-[10px] font-manrope-semi uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
          {value === 1 ? "día" : "días"}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          if (!canIncrease) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value + 1);
        }}
        disabled={!canIncrease}
        hitSlop={4}
        className="w-14 h-14 items-center justify-center active:opacity-50"
        style={{ opacity: canIncrease ? 1 : 0.3 }}
      >
        <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark leading-none">
          +
        </Text>
      </Pressable>
    </View>
  );
}

function DaySlot({
  slot,
  dayNumber,
  frequencyCount,
  onPress,
  onClear,
  mutedColor,
}) {
  const hasSession = !!slot.session_id;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-3.5 py-3 mb-2 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:scale-[0.98]"
    >
      <View className="w-10 h-10 rounded-lg items-center justify-center mr-3.5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <Text className="text-[9px] font-manrope-semi uppercase text-brandPrimary-500 dark:text-brandPrimary-400">
          Día
        </Text>
        <Text className="text-sm font-jakarta-bold leading-tight text-brandPrimary-600 dark:text-brandPrimary-400">
          {dayNumber}
        </Text>
      </View>

      <Text
        className={`flex-1 text-sm font-manrope ${
          hasSession
            ? "text-ui-text-main dark:text-ui-text-mainDark"
            : "text-ui-text-muted dark:text-ui-text-mutedDark"
        }`}
        numberOfLines={1}
      >
        {hasSession ? slot.session_name : "Elegir sesión..."}
      </Text>

      {frequencyCount > 1 && (
        <View
          className="mr-2.5 rounded-full px-2 py-0.5"
          style={{ backgroundColor: brandPrimary[500] + "22" }}
        >
          <Text
            className="text-[11px] font-manrope-semi"
            style={{ color: brandPrimary[500] }}
          >
            ×{frequencyCount}
          </Text>
        </View>
      )}

      {hasSession ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClear();
          }}
          hitSlop={10}
          className="active:opacity-50 p-0.5"
        >
          <X size={14} color={mutedColor} />
        </Pressable>
      ) : (
        <ChevronRight size={14} color={mutedColor} />
      )}
    </Pressable>
  );
}

export default function FormTrainingPlan({ form, plan }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;

  const pickerRef = useRef(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: availableSessions = [] } = useSessions();

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return availableSessions;
    const q = searchQuery.toLowerCase();
    return availableSessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableSessions, searchQuery]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const openPickerForSlot = (idx) => {
    setActiveSlotIdx(idx);
    setSearchQuery("");
    Keyboard.dismiss();
    pickerRef.current?.present();
  };

  const handleSessionSelect = (session) => {
    if (activeSlotIdx === null) return;
    const newDays = form.state.values.days.map((d, i) =>
      i === activeSlotIdx
        ? { ...d, session_id: session.id, session_name: session.name }
        : d
    );
    form.setFieldValue("days", newDays);
    pickerRef.current?.dismiss();
    setActiveSlotIdx(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClearSlot = (idx) => {
    const newDays = form.state.values.days.map((d, i) =>
      i === idx ? { ...d, session_id: null, session_name: null } : d
    );
    form.setFieldValue("days", newDays);
  };

  const handleWeeklyDaysChange = (newCount) => {
    const current = form.state.values.days;
    let newDays = [...current];
    if (newCount > current.length) {
      for (let i = current.length; i < newCount; i++) {
        newDays.push({
          id: Crypto.randomUUID(),
          session_id: null,
          session_name: null,
        });
      }
    } else {
      newDays = newDays.slice(0, newCount);
    }
    form.setFieldValue("weekly_days", newCount);
    form.setFieldValue("days", newDays);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="px-4 pt-6 pb-2">
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            {plan ? "Editar Plan" : "Nuevo Plan"}
          </Text>
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
            {plan
              ? "Modificá el plan y guardá los cambios."
              : "Definí el objetivo, la frecuencia y las sesiones de cada día."}
          </Text>
        </View>

        <View className="px-4 pt-4 pb-10">
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

          {/* ─── OBJETIVO ─── */}
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

          {/* ─── DÍAS SEMANALES ─── */}
          <form.Field name="weekly_days">
            {(field) => (
              <FormField label="DÍAS SEMANALES">
                <DayStepper
                  value={field.state.value}
                  onChange={handleWeeklyDaysChange}
                />
              </FormField>
            )}
          </form.Field>

          {/* ─── SLOTS ─── */}
          <form.Field
            name="days"
            validators={{
              onSubmit: ({ value }) => {
                if (value.some((d) => !d.session_id))
                  return "Asigná una sesión a cada día";
                return undefined;
              },
            }}
          >
            {(field) => {
              const days = field.state.value;
              const freqMap = {};
              for (const d of days) {
                if (d.session_id)
                  freqMap[d.session_id] = (freqMap[d.session_id] ?? 0) + 1;
              }

              return (
                <View className="mt-2">
                  {field.state.meta.errors?.[0] && (
                    <Text className="text-red-500 dark:text-red-400 text-[11px] mb-3 font-manrope-semi italic">
                      {field.state.meta.errors[0]}
                    </Text>
                  )}
                  {days.map((slot, idx) => (
                    <DaySlot
                      key={slot.id}
                      slot={slot}
                      dayNumber={idx + 1}
                      frequencyCount={freqMap[slot.session_id] ?? 1}
                      onPress={() => openPickerForSlot(idx)}
                      onClear={() => handleClearSlot(idx)}
                      mutedColor={mutedColor}
                    />
                  ))}
                </View>
              );
            }}
          </form.Field>

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
                label={plan ? "Editar plan" : "Guardar plan"}
              />
            )}
          </form.Subscribe>
        </View>
      </ScrollView>

      {/* ─── PICKER DE SESIONES ─── */}
      <BottomSheetModal
        ref={pickerRef}
        index={1}
        snapPoints={["50%", "90%"]}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark
            ? ui.surfaceSecondary.dark
            : ui.surfaceSecondary.light,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
        onDismiss={() => {
          setSearchQuery("");
          setActiveSlotIdx(null);
        }}
      >
        <View className="px-6 pt-4 pb-2">
          <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark mb-4">
            Elegir sesión
            {activeSlotIdx !== null ? ` · Día ${activeSlotIdx + 1}` : ""}
          </Text>
          <BottomSheetTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar sesión..."
            placeholderTextColor={mutedColor}
            style={{
              backgroundColor: isDark
                ? ui.surfaceSecondary.dark
                : ui.surfaceSecondary.light,
              color: isDark ? ui.text.mainDark : ui.text.main,
              padding: 14,
              borderRadius: 12,
              fontFamily: "Manrope_400Regular",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
            }}
          />
        </View>

        <BottomSheetFlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ListEmptyComponent={() => (
            <View className="items-center justify-center p-6 mt-4">
              <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-center font-manrope">
                {searchQuery
                  ? `Sin resultados para "${searchQuery}"`
                  : "No hay sesiones creadas aún"}
              </Text>
            </View>
          )}
          renderItem={({ item: session }) => {
            const isSelected =
              activeSlotIdx !== null &&
              form.state.values.days[activeSlotIdx]?.session_id === session.id;

            return (
              <Pressable
                onPress={() => handleSessionSelect(session)}
                className={`p-4 mb-2 rounded-xl flex-row justify-between items-center active:scale-[0.97] border ${
                  isSelected
                    ? "border-brandPrimary-500/20"
                    : "border-transparent"
                }`}
                style={{
                  backgroundColor: isSelected
                    ? "rgba(74,68,228,0.08)"
                    : isDark
                      ? ui.surfaceSecondary.dark
                      : ui.surfaceSecondary.light,
                }}
              >
                <Text
                  className={`text-base font-manrope ${
                    isSelected
                      ? "text-brandPrimary-600 font-manrope-bold"
                      : "text-ui-text-main dark:text-ui-text-mainDark"
                  }`}
                >
                  {session.name}
                </Text>
                {isSelected && (
                  <Text className="text-brandPrimary-600 font-manrope-bold">
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
}
