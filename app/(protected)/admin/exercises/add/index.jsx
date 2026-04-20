import FormExercise from "../../../../../src/components/forms/FormExercise";
import { useForm } from "@tanstack/react-form";
import { database } from "../../../../../src/database";
import {
  exercises_base,
  exercise_equipment,
} from "../../../../../src/database/schemas";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

export default function AddExerciseScreen() {
  const queryClient = useQueryClient();
  const addForm = useForm({
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
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: 0, animated: true });
        }
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
      form={addForm}
      headerTitle="Nuevo Ejercicio"
      headerDescription="Completá los datos para agregar un ejercicio al catálogo."
    />
  );
}
