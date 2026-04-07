import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useRef, useState } from "react";
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
import AddEquipment from "../../../../src/components/forms/AddEquipment";
import PreviewImage from "../../../../src/components/images/PreviewImage";

// Form-specific sub-components
import FormField from "../../../../src/components/forms/FormField";
import StyledTextInput from "../../../../src/components/forms/StyledTextInput";
import YouTubeVideoCard from "../../../../src/components/forms/YouTubeVideoCard";
import ImagePickerCard from "../../../../src/components/forms/ImagePickerCard";
import UnilateralToggle from "../../../../src/components/forms/UnilateralToggle";
import SubmitButton from "../../../../src/components/forms/SubmitButton";

// Icons & theme
import { ui } from "../../../../src/theme/colors";
import { Trash, Barbell } from "../../../../assets/icons";

import HandlePickImage from "../../../../src/utils/handlePickImage";
import { useMediaPicker } from "../../../../src/hooks/useMediaPicker";

export default function AddExercise() {
  const queryClient = useQueryClient();
  const { pickMedia } = useMediaPicker();

  const [isCreatingEquipment, setIsCreatingEquipment] = useState(false);
  const [initialEquipmentName, setInitialEquipmentName] = useState("");

  const { data: dbEquipments = [] } = useQuery({
    queryKey: ["equipments"],
    queryFn: async () => {
      const results = await database.select().from(equipmentSchema);
      return results || [];
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      category: "",
      muscle_group: "",
      equipments: [], // Ahora es un array de objetos { name, image_public_id/uri, isNew, etc }
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

        // 1. Insertar Ejercicio Base
        await database.insert(exercises_base).values({
          id: newExerciseId,
          name: value.name,
          category: value.category,
          muscle_group: value.muscle_group,
          cloudinary_video_public_id: value.cloudinary_video_public_id,
          cloudinary_image_public_id: value.cloudinary_image_public_id,
          local_video_uri: value.local_video_uri || "",
          local_image_uri: value.local_image_uri || "",
          youtube_video_url: value.youtube_video_url,
          instructions: value.instructions,
          is_unilateral: value.is_unilateral ? 1 : 0,
        });

        // 2. Manejar Equipamiento (Muchos a Muchos)
        for (const eq of value.equipments) {
          let eqId = eq.id;
          if (eq.isNew) {
            eqId = Crypto.randomUUID();
            await database.insert(equipmentSchema).values({
              id: eqId,
              name: eq.name,
              cloudinary_image_public_id: null, // Se subirá en background si hay local_uri
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

  const renderEquipmentItem = ({ item, index }, field) => (
    <View
      key={index}
      className="flex-row items-center bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark rounded-xl p-2 border border-ui-input-light dark:border-ui-input-dark mr-2"
    >
      <View className="w-10 h-10 rounded-lg overflow-hidden mr-2">
        <PreviewImage value={item.local_image_uri || item.image_public_id} />
      </View>
      <View>
        <Text className="text-[10px] font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
          EQUIPO
        </Text>
        <Text className="text-xs font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark">
          {item.name}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          const newList = [...field.state.value];
          newList.splice(index, 1);
          field.handleChange(newList);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        className="ml-3 p-1"
      >
        <Trash color="#ef4444" size={14} />
      </Pressable>
    </View>
  );

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
        <form.Field name="equipments">
          {(field) => (
            <>
              {/* Lista de equipos agregados con FlatList */}
              {field.state.value.length > 0 && (
                <View className="mb-2">
                  <FlatList
                    data={field.state.value}
                    renderItem={(props) => renderEquipmentItem(props, field)}
                    keyExtractor={(_, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              )}
              {!isCreatingEquipment ? (
                <CustomSelect
                  label="EQUIPAMIENTO"
                  options={dbEquipments.map((eq) => ({
                    value: eq.id,
                    label: eq.name,
                  }))}
                  value={null}
                  searchable={true}
                  onChange={(selectedId) => {
                    const selectedEq = dbEquipments.find(
                      (e) => e.id === selectedId
                    );
                    if (
                      selectedEq &&
                      !field.state.value.find((e) => e.id === selectedId)
                    ) {
                      field.handleChange([
                        ...field.state.value,
                        {
                          id: selectedEq.id,
                          name: selectedEq.name,
                          image_public_id: selectedEq.local_image_uri,
                          isNew: false,
                        },
                      ]);
                    }
                  }}
                  actionLabel="Crear máquina nueva"
                  onActionPress={(query) => {
                    setInitialEquipmentName(query);
                    setIsCreatingEquipment(true);
                  }}
                />
              ) : (
                <AddEquipment
                  initialName={initialEquipmentName}
                  onCancel={() => setIsCreatingEquipment(false)}
                  onAdd={(newEq) => {
                    field.handleChange([...field.state.value, newEq]);
                    setIsCreatingEquipment(false);
                  }}
                />
              )}
            </>
          )}
        </form.Field>

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
                  setVideoPublicId={(id) =>
                    form.setFieldValue("cloudinary_video_public_id", id)
                  }
                  videoPublicId={form.state.values.cloudinary_video_public_id}
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
                setImagePublicId={(id) =>
                  form.setFieldValue("cloudinary_image_public_id", id)
                }
                imagePublicId={form.state.values.cloudinary_image_public_id}
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
