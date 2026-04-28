import { useForm } from "@tanstack/react-form";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

export const useRoutineForm = ({ onSuccess, initialValues = {} } = {}) => {
  const form = useForm({
    defaultValues: {
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      objective: initialValues.objective ?? "",
      level: initialValues.level ?? "",
      estimated_duration_min: initialValues.estimated_duration_min ?? "",
      cover_image_uri: initialValues.cover_image_uri ?? "",
      status: initialValues.status ?? "borrador",
      exercises: initialValues.exercises ?? [],
    },
    onSubmit: async ({ value }) => {
      // TODO: persist to routines + routine_exercises tables when schema is ready
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "¡Rutina guardada!",
        text2: `"${value.name}" fue guardada como ${value.status}.`,
        position: "bottom",
      });
      if (onSuccess) onSuccess(value);
    },
  });

  return form;
};
