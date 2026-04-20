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
import { useForm } from "@tanstack/react-form";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";
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
  const queryClient = useQueryClient();
  const editExerciseForm = useForm({
    defaultValues: {
      name: "",
      category: "",
      muscle_group: "",
      equipments: [], // Ahora es un array de objetos { name, image_public_id/uri, isNew, etc }
      youtube_video_url: "",
      image_uri: "",
      video_uri: "",
      instructions: "",
      is_unilateral: false,
    },
    onSubmit: async ({ value }) => {
      try {
        const exerciseId = Crypto.randomUUID();

        const exerciseValues = {
          name: value.name.trim(),
          category: value.category,
          muscle_group: value.muscle_group,
          video_uri: value.video_uri,
          image_uri: value.image_uri,
          youtube_video_url: value.youtube_video_url,
          instructions: value.instructions,
          is_unilateral: value.is_unilateral ? 1 : 0,
        };

        await database.insert(exercises_base).values({
          id: exerciseId,
          ...exerciseValues,
        });

        // 2. Manejar Equipamiento (Muchos a Muchos)
        if (value.equipments && value.equipments.length > 0) {
          for (const eq of value.equipments) {
            await database.insert(exercise_equipment).values({
              id: Crypto.randomUUID(),
              exercise_id: exerciseId,
              equipment_id: eq.id,
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ["exercises"] });
        queryClient.invalidateQueries({ queryKey: ["exercise", exerciseId] });
        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Éxito!",
          text2: "El ejercicio fue agregado exitosamente al catálogo.",
          position: "bottom",
        });

        addForm.reset();
        /*  if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: 0, animated: true });
        } */
      } catch (error) {
        console.error("Error al insertar un ejercicio", error.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Error al guardar, intente nuevamente.",
          text2: error.message,
          position: "bottom",
        });
      }
    },
  });
  return (
    <FormExercise
      headerTitle="Editar Ejercicio"
      headerDescription="Modifica los datos del ejercicio"
      form={editExerciseForm}
      exercise={data}
    />
  );
}
