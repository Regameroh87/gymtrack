import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Screen from "../../../../src/components/Screen";
import { supabase } from "../../../../src/database/supabase";
import { Plus, Trash, Barbell } from "../../../../assets/icons";
import { brandPrimary, ui } from "../../../../src/theme/colors";
import CustomSelect from "../../../../src/components/CustomSelect";
import FormField from "../../../../src/components/forms/FormField";

export default function RoutineBuilder() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [routineName, setRoutineName] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, last_name, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["admin_exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises_base")
        .select("id, name, muscle_group")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleAddExercise = (exerciseId) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExercises([
      ...selectedExercises,
      { ...ex, sets: "4", reps: "12" },
    ]);
  };

  const handleRemoveExercise = (idx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const arr = [...selectedExercises];
    arr.splice(idx, 1);
    setSelectedExercises(arr);
  };

  const isValid =
    routineName.length > 0 &&
    selectedUser.length > 0 &&
    selectedExercises.length > 0;

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Armar Rutina
          </Text>
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
            Configura un plan de entrenamiento personalizado.
          </Text>
        </View>

        {/* ── Paso 1: Identificación ── */}
        <View className="mb-8">
          <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
            1 · Identificación
          </Text>

          <FormField label="NOMBRE DE LA RUTINA">
            <TextInput
              className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-4 font-manrope text-sm text-ui-text-main dark:text-ui-text-mainDark"
              placeholder="Ej: Torso Fuerza"
              placeholderTextColor={ui.text.muted}
              value={routineName}
              onChangeText={setRoutineName}
            />
          </FormField>

          <View className="mt-4">
            <CustomSelect
              label="SOCIO / ALUMNO"
              options={
                users?.map((u) => ({
                  label: `${u.name} ${u.last_name}`,
                  value: u.id,
                })) || []
              }
              value={selectedUser}
              onChange={setSelectedUser}
            />
          </View>
        </View>

        {/* ── Paso 2: Ejercicios ── */}
        <View className="mb-8">
          <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
            2 · Carga Técnica ({selectedExercises.length})
          </Text>

          <View className="mb-4">
            <CustomSelect
              placeholder="Seleccionar ejercicio..."
              options={
                exercises?.map((e) => ({ label: e.name, value: e.id })) || []
              }
              value=""
              onChange={(val) => {
                if (val) handleAddExercise(val);
              }}
            />
          </View>

          {selectedExercises.map((ex, idx) => (
            <View
              key={idx}
              className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-3 mb-2 flex-row items-center"
            >
              <View className="w-10 h-10 rounded-lg items-center justify-center mr-3 bg-brandPrimary-50 dark:bg-brandPrimary-950">
                <Barbell size={18} color={brandPrimary[600]} />
              </View>
              <View className="flex-1">
                <Text
                  className="font-jakarta-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
                  numberOfLines={1}
                >
                  {ex.name}
                </Text>
                <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                  {ex.muscle_group || "General"}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveExercise(idx)}
                className="p-2"
              >
                <Trash size={16} color="#ef4444" />
              </Pressable>
            </View>
          ))}

          {selectedExercises.length === 0 && (
            <View className="py-10 items-center justify-center rounded-xl border border-dashed border-ui-input-border">
              <Plus size={28} className="text-ui-text-muted dark:text-ui-text-mutedDark" />
              <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-2">
                Agrega ejercicios del catálogo
              </Text>
            </View>
          )}
        </View>

        {/* ── Submit ── */}
        <Pressable
          disabled={!isValid}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }}
          className="active:scale-[0.98]"
          style={{ opacity: isValid ? 1 : 0.3 }}
        >
          <LinearGradient
            colors={[brandPrimary[600], brandPrimary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-xl items-center shadow-xl shadow-brandPrimary-600/30"
          >
            <Text className="text-white font-jakarta-semi text-base">
              Guardar y Asignar Rutina
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
