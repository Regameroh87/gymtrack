// React
import { useEffect } from "react";

// Librerías externas
import { useForm } from "@tanstack/react-form";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

const makeEmptySlot = () => ({
  id: Crypto.randomUUID(),
  session_id: null,
  session_name: null,
});

export const useTrainingPlanForm = ({ id = null, onSuccess } = {}) => {
  const form = useForm({
    defaultValues: {
      name: "",
      objective: "",
      weekly_days: 3,
      days: [makeEmptySlot(), makeEmptySlot(), makeEmptySlot()],
    },
    onSubmit: async ({ value }) => {
      // TODO: insertar en BD cuando los schemas estén listos
      console.log("Plan a guardar:", value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: id ? "¡Plan actualizado!" : "¡Plan guardado!",
        text2: `"${value.name}" fue guardado correctamente.`,
        position: "bottom",
      });
      if (onSuccess) onSuccess();
    },
  });

  return { form, isLoading: false };
};
