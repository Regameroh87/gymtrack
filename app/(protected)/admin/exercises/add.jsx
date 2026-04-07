import { View, Text, TextInput, Pressable } from "react-native";
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import Toast from "react-native-toast-message";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { database } from "../../../../src/database";
import {
  exercises_base,
  equipment as equipmentSchema,
  exercise_equipment,
} from "../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../src/database/sync";
import useAsyncStorage from "../../../../src/hooks/useAsyncStorage";

// Constants
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
} from "../../../../src/constants/exerciseOptions";

// Shared components
import CustomSelect from "../../../../src/components/CustomSelect";
import InputUploadVideo from "../../../../src/components/videos/InputUploadVideo";
import PreviewImage from "../../../../src/components/images/PreviewImage";

// Form-specific sub-components
import FormField from "../../../../src/components/forms/FormField";
import StyledTextInput from "../../../../src/components/forms/StyledTextInput";
import YouTubeVideoCard from "../../../../src/components/forms/YouTubeVideoCard";
import ImagePickerCard from "../../../../src/components/forms/ImagePickerCard";
import UnilateralToggle from "../../../../src/components/forms/UnilateralToggle";
import SubmitButton from "../../../../src/components/forms/SubmitButton";

// Icons & theme
import {
  Barbell,
  CameraPlus,
  CloudUpload,
  Plus,
  Trash,
  X,
} from "../../../../assets/icons";
import { ui } from "../../../../src/theme/colors";
import { useTheme } from "../../../../src/theme/theme";

import HandlePickImage from "../../../../src/utils/handlePickImage";
import { useMediaPicker } from "../../../../src/hooks/useMediaPicker";
import { useState, useMemo } from "react";

export default function AddExercise() {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();

  const { data: dbEquipments = [] } = useQuery({
    queryKey: ["equipments"],
    queryFn: async () => {
      const results = await database.select().from(equipmentSchema);
      return results || [];
    },
  });

  const equipmentOptions = useMemo(() => {
    return [
      ...dbEquipments.map((eq) => ({
        label: eq.name,
        value: eq.id,
      })),
      { label: "+ Crear nuevo equipamiento...", value: "NEW" },
    ];
  }, [dbEquipments]);

  const [selectedEquipmentValue, setSelectedEquipmentValue] = useState("");
  const [currentEquipment, setCurrentEquipment] = useState({
    name: "",
    image_public_id: "",
  });

  const form = useForm({
    defaultValues: {
      name: "",
      category: "",
      muscle_group: "",
      equipments: [], // Ahora es un array de objetos { name, image_public_id }
      youtube_video_url: "",
      local_image_uri: "",
      cloudinary_image_public_id: "",
      local_video_uri: "",
      cloudinary_video_public_id: "",
      instructions: "",
      is_unilateral: false,
    },
    onSubmit: async ({ value }) => {
      try {
        const newExerciseId = Crypto.randomUUID();

        await database.insert(exercises_base).values({
          id: newExerciseId,
          name: value.name,
          category: value.category,
          muscle_group: value.muscle_group,
          cloudinary_video_public_id: null,
          cloudinary_image_public_id: null,
          local_video_uri: value.local_video_uri || "",
          local_image_uri: value.local_image_uri || "",
          youtube_video_url: value.youtube_video_url,
          instructions: value.instructions,
          is_unilateral: value.is_unilateral ? 1 : 0,
        });

        for (const eq of value.equipments) {
          let eqId = eq.id;
          if (eq.isNew) {
            eqId = Crypto.randomUUID();
            await database.insert(equipmentSchema).values({
              id: eqId,
              name: eq.name,
              cloudinary_image_public_id: null,
              local_image_uri: eq.image_public_id || "",
            });
          }
          await database.insert(exercise_equipment).values({
            id: Crypto.randomUUID(),
            exercise_id: newExerciseId,
            equipment_id: eqId,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["exercises"] });
        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        checkNetInfoAndSync();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Éxito!",
          text2: "El ejercicio fue agregado exitosamente al catálogo.",
          position: "bottom",
        });

        form.reset();
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: 0, animated: true });
        }
      } catch (error) {
        console.error("Error al insertar un ejercicio", error.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Error al guardar",
          text2: error.message,
          position: "bottom",
        });
      }
    },
  });

  useAsyncStorage({ form, storageKey: "addExerciseDraft" });
  const scrollRef = useRef(null);
  const scrollOffset = useRef(0);
  const youtubeCardRef = useRef(null);
  const uploadVideoCardRef = useRef(null);
  const imageCardRef = useRef(null);
  const instructionsRef = useRef(null);

  const scrollToCard = (cardRef) => {
    if (!cardRef.current || !scrollRef.current) return;
    cardRef.current.measure((_x, _y, _w, _h, _pageX, pageY) => {
      const contentY = pageY + scrollOffset.current - 150;
      scrollRef.current.scrollTo({
        y: Math.max(0, contentY),
        animated: true,
      });
    });
  };

  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollOffset.current = e.nativeEvent.contentOffset.y;
      }}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
    >
      {/* ── Header ── */}
      <View className="px-4 pt-6 pb-2">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
          Nuevo Ejercicio
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
          Completá los datos para agregar un ejercicio al catálogo.
        </Text>
      </View>

      {/* ── Form ── */}
      <View className="px-4 pt-4 pb-8">
        {/* Nombre */}
        <FormField label="NOMBRE DEL EJERCICIO">
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value) return undefined;
                const result = z
                  .string()
                  .min(3, "Mínimo 3 caracteres")
                  .safeParse(value);
                return result.success
                  ? undefined
                  : result.error.errors[0].message;
              },
              onSubmit: ({ value }) => {
                if (!value) return "El nombre es requerido";
                return undefined;
              },
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: Press de Banca"
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1 font-manrope">
                    {field.state.meta.errors.join(", ")}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

        {/* Categoría + Grupo Muscular */}
        <View className="flex-row w-full justify-center gap-3 mb-5">
          <View className="w-1/2">
            <form.Field
              name="category"
              validators={{
                onChange: ({ value }) => {
                  const result = z
                    .string()
                    .min(1, "La categoría es requerida")
                    .safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.errors[0].message;
                },
              }}
            >
              {(field) => (
                <CustomSelect
                  label="CATEGORÍA"
                  options={EXERCISE_CATEGORIES}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </View>
          <View className="w-1/2">
            <form.Field name="muscle_group">
              {(field) => (
                <CustomSelect
                  label="GRUPO MUSCULAR"
                  options={MUSCLE_GROUPS}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </View>
        </View>

        {/* Equipo */}

        {/* Multimedia */}
        <View className="mt-4">
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-4 uppercase tracking-label">
            MULTIMEDIA
          </Text>

          <form.Field name="youtube_video_url">
            {(field) => (
              <YouTubeVideoCard
                ref={youtubeCardRef}
                value={field.state.value}
                onChange={field.handleChange}
                onFocus={() => scrollToCard(youtubeCardRef)}
              />
            )}
          </form.Field>

          <View
            ref={uploadVideoCardRef}
            className="rounded-2xl mb-4 border border-brandPrimary-600 border-l-4"
          >
            <form.Field name="local_video_uri">
              {(field) => (
                <InputUploadVideo
                  value={field.state.value}
                  onChange={field.handleChange}
                  setVideoPublicId={(video_public_id) =>
                    form.setFieldValue("video_public_id", video_public_id)
                  }
                  videoPublicId={form.state.values.video_public_id}
                />
              )}
            </form.Field>
          </View>

          {/* Imagen de portada Ejercicio */}
          <form.Field name="local_image_uri">
            {(field) => (
              <ImagePickerCard
                ref={imageCardRef}
                value={field.state.value}
                onChange={field.handleChange}
                setImagePublicId={(image_public_id) =>
                  form.setFieldValue("image_public_id", image_public_id)
                }
                imagePublicId={form.state.values.image_public_id}
                onFocus={() => scrollToCard(imageCardRef)}
              />
            )}
          </form.Field>
        </View>

        {/* Instrucciones */}
        <View ref={instructionsRef}>
          <FormField label="INSTRUCCIONES" className="mt-6">
            <form.Field name="instructions">
              {(field) => (
                <TextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onFocus={() => scrollToCard(instructionsRef)}
                  placeholder="Describe los pasos detalladamente..."
                  placeholderTextColor={ui.text.muted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className="font-manrope rounded-xl min-h-28 p-4 bg-ui-surface-light dark:bg-ui-surface-dark text-ui-text-main dark:text-ui-text-mainDark text-sm"
                />
              )}
            </form.Field>
          </FormField>
        </View>

        {/* Toggle Unilateral */}
        <View className="mt-6">
          <form.Field name="is_unilateral">
            {(field) => (
              <UnilateralToggle
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </View>

        {/* Submit */}
        <SubmitButton
          onPress={() => form.handleSubmit()}
          isLoading={form.state.isSubmitting}
          title="Guardar Ejercicio"
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
