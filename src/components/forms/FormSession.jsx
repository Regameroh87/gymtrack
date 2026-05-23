// React Native
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { useColorScheme } from "nativewind";
import { z } from "zod";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";

// Base de datos
import { database } from "../../database";
import { exercises_base } from "../../database/schemas";

// Hooks
import useAsyncStorage from "../../hooks/useAsyncStorage";

// Constantes
import { SESSION_LEVELS } from "../../constants/sessionOptions";

// Componentes
import CustomSelect from "../CustomSelect";
import FormField from "./FormField";
import ImagePickerCard from "./ImagePickerCard";
import FormsHeader from "../FormsHeader";
import SessionExerciseCard from "./SessionExerciseCard";
import StyledTextInput from "./StyledTextInput";
import SubmitButton from "./SubmitButton";

// Tema y assets
import { ui } from "../../theme/colors";
import { Plus, Pencil } from "../../../assets/icons";

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
      {children}
    </Text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FormSession({ form, session }) {
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
    storageKey: "addSessionDraft",
    enabled: !session,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <FormsHeader
          title={session ? "Editar Sesión" : "Armar Sesión"}
          subtitle={
            session
              ? "Modificá los campos que quieras y guardá los cambios."
              : "Creá una plantilla de entrenamiento reutilizable."
          }
        />

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
                  label="NOMBRE DE LA SESIÓN"
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
                    placeholder="Filosofía de la sesión, cómo progresar, notas generales..."
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
                  options={SESSION_LEVELS}
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder="Seleccionar nivel..."
                  error={field.state.meta.errors?.[0]}
                  searchable={false}
                  snapPoints={["40%"]}
                />
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
              onSubmit: ({ value }) => {
                if (!value?.length) return "Agregá al menos un ejercicio";
                const ids = value.map((ex) => ex.exercise_id);
                if (new Set(ids).size !== ids.length) {
                  return "Hay ejercicios repetidos en la lista";
                }
                return undefined;
              },
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
                    };
                    field.handleChange([...field.state.value, newEntry]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />

                {field.state.value.map((item, idx) => (
                  <SessionExerciseCard
                    key={item.id}
                    exercise={item}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < field.state.value.length - 1}
                    onMoveUp={() => {
                      const list = [...field.state.value];
                      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                      field.handleChange(list);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onMoveDown={() => {
                      const list = [...field.state.value];
                      [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                      field.handleChange(list);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onDelete={() => {
                      field.handleChange(
                        field.state.value.filter((_, i) => i !== idx)
                      );
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  />
                ))}

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
                disabled={!!session && !isDirty}
                label={session ? "Editar sesión" : "Guardar sesión"}
                icon={session ? Pencil : null}
              />
            )}
          </form.Subscribe>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
