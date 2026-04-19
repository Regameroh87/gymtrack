import { View, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { database } from "../../../../../src/database";
import {
  exercises_base,
  equipment,
  exercise_equipment,
} from "../../../../../src/database/schemas";
import { eq, inArray } from "drizzle-orm";

import FormExercise from "../../../../../src/components/forms/FormExercise";

export default function EditExercise() {
  const { id } = useLocalSearchParams();
  console.log("soy el id", id);

  const { data, isLoading } = useQuery({
    queryKey: ["exercise", id],
    queryFn: async () => {
      const result = await database
        .select()
        .from(exercises_base)
        .where(eq(exercises_base.id, id));

      if (result.length === 0) return null;

      const exerciseData = result[0];

      const relResults = await database
        .select()
        .from(exercise_equipment)
        .where(eq(exercise_equipment.exercise_id, id));

      const equipmentIds = relResults.map((r) => r.equipment_id);

      let equipmentsForExercise = [];
      if (equipmentIds.length > 0) {
        equipmentsForExercise = await database
          .select()
          .from(equipment)
          .where(inArray(equipment.id, equipmentIds));
      }

      return {
        ...exerciseData,
        equipments: equipmentsForExercise.map((eq) => ({
          id: eq.id,
          name: eq.name,
          image_public_id: eq.local_image_uri || eq.cloudinary_image_public_id,
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
  console.log("soy el data", data);
  return (
    <FormExercise
      headerTitle="Editar Ejercicio"
      headerDescription="Modifica los datos del ejercicio"
      exercise={data}
    />
  );
}
