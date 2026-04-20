import { View, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { database } from "../../../../../src/database";
import {
  exercises_base,
  equipment,
  exercise_equipment,
} from "../../../../../src/database/schemas";
import { eq } from "drizzle-orm";

import FormExercise from "../../../../../src/components/forms/FormExercise";

export default function EditExercise() {
  const { id } = useLocalSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ["exercise", id],
    queryFn: async () => {
      const result = await database
        .select()
        .from(exercises_base)
        .where(eq(exercises_base.id, id));

      if (result.length === 0) return null;

      const exerciseData = result[0];

      const equipmentsForExercise = await database
        .select({
          id: equipment.id,
          name: equipment.name,
          image_uri: equipment.image_uri,
        })
        .from(exercise_equipment)
        .innerJoin(equipment, eq(exercise_equipment.equipment_id, equipment.id))
        .where(eq(exercise_equipment.exercise_id, id));

      return {
        ...exerciseData,
        equipments: equipmentsForExercise.map((item) => ({
          ...item,
          isNew: false,
        })),
      };
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FormExercise
      headerTitle="Editar Ejercicio"
      headerDescription="Modifica los datos del ejercicio"
      exercise={data}
    />
  );
}
