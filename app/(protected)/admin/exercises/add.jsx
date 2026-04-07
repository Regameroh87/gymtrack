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
import { ui, brandPrimary, brandSecondary } from "../../../../src/theme/colors";
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
      video_url: "",
      video_public_id: "",
      youtube_video_url: "",
      image_url: "",
      image_public_id: "",
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
          video_public_id: value.video_public_id,
          youtube_video_url: value.youtube_video_url,
          image_public_id: value.image_public_id,
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
              image_public_id: eq.image_public_id,
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
        <FormField label="EQUIPAMIENTO REQUERIDO">
          <form.Field name="equipments">
            {(field) => (
              <View className="gap-y-4">
                {/* Lista de equipos agregados */}
                {field.state.value.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mb-2">
                    {field.state.value.map((item, index) => (
                      <View
                        key={index}
                        className="flex-row items-center bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark rounded-xl p-2 border border-ui-input-light dark:border-ui-input-dark"
                      >
                        <View className="w-10 h-10 rounded-lg overflow-hidden mr-2">
                          <PreviewImage value={item.image_public_id} />
                        </View>
                        <Text className="text-xs font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark mr-2">
                          {item.name}
                        </Text>
                        <Pressable
                          onPress={() => {
                            const newList = [...field.state.value];
                            newList.splice(index, 1);
                            field.handleChange(newList);
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium
                            );
                          }}
                        >
                          <Trash color="#ef4444" size={14} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <CustomSelect
                  label=""
                  placeholder="Seleccionar equipamiento..."
                  options={equipmentOptions}
                  value={selectedEquipmentValue}
                  onChange={(val) => {
                    setSelectedEquipmentValue(val);
                    if (val !== "NEW" && val) {
                      const eq = dbEquipments.find((e) => e.id === val);
                      if (
                        eq &&
                        !field.state.value.some((e) => e.id === eq.id)
                      ) {
                        field.handleChange([
                          ...field.state.value,
                          { ...eq, isNew: false },
                        ]);
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success
                        );
                      }
                      setSelectedEquipmentValue("");
                    }
                  }}
                />

                {selectedEquipmentValue === "NEW" && (
                  <View className="rounded-2xl p-4 border border-ui-input-light dark:border-ui-input-dark bg-ui-surface-light dark:bg-ui-surface-dark/30 mt-2">
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-[10px] font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
                        Crear Nuevo Equipo
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          setSelectedEquipmentValue("");
                          setCurrentEquipment({
                            name: "",
                            image_public_id: "",
                          });
                        }}
                        className="bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark p-1.5 rounded-full"
                      >
                        <X
                          color={isDark ? ui.text.mainDark : ui.text.main}
                          size={14}
                        />
                      </Pressable>
                    </View>

                    <StyledTextInput
                      value={currentEquipment.name}
                      onChangeText={(text) =>
                        setCurrentEquipment((prev) => ({ ...prev, name: text }))
                      }
                      placeholder="Nombre (ej: Barra Olímpica)"
                      icon={<Barbell color={ui.text.mutedDark} />}
                    />

                    <View className="flex-row gap-4 mt-3 items-center">
                      <View className="w-24 h-24">
                        <PreviewImage value={currentEquipment.image_public_id}>
                          <CameraPlus color={ui.text.mutedDark} size={24} />
                        </PreviewImage>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light
                              );
                              HandlePickImage({
                                pickMedia,
                                source: "gallery",
                                onChange: (_uri, public_id) =>
                                  setCurrentEquipment((prev) => ({
                                    ...prev,
                                    image_public_id: public_id,
                                  })),
                              });
                            }}
                            className="flex-1 flex-row border border-brandSecondary-500/20 justify-center items-center gap-2 bg-brandSecondary-600/10 rounded-xl p-2.5"
                          >
                            <CloudUpload
                              color={isDark ? "#62fae3" : "#059669"}
                              size={14}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Medium
                              );
                              HandlePickImage({
                                pickMedia,
                                source: "camera",
                                onChange: (_uri, public_id) =>
                                  setCurrentEquipment((prev) => ({
                                    ...prev,
                                    image_public_id: public_id,
                                  })),
                              });
                            }}
                            className="flex-1 flex-row border border-brandPrimary-500/20 justify-center items-center gap-2 bg-brandPrimary-600/10 rounded-xl p-2.5"
                          >
                            <CameraPlus
                              color={isDark ? "#a5b4fc" : "#3023cd"}
                              size={14}
                            />
                          </Pressable>
                        </View>

                        <Pressable
                          disabled={!currentEquipment.name}
                          onPress={() => {
                            if (!currentEquipment.name) return;
                            field.handleChange([
                              ...field.state.value,
                              { ...currentEquipment, isNew: true },
                            ]);
                            setCurrentEquipment({
                              name: "",
                              image_public_id: "",
                            });
                            setSelectedEquipmentValue("");
                            Haptics.notificationAsync(
                              Haptics.NotificationFeedbackType.Success
                            );
                          }}
                          className={`flex-row justify-center items-center gap-2 rounded-xl p-3 mt-2 ${currentEquipment.name ? "bg-brandPrimary-600" : "bg-ui-input-light dark:bg-ui-input-dark opacity-50"}`}
                        >
                          <Plus color="white" size={14} />
                          <Text className="text-white text-xs font-jakarta-bold">
                            AGREGAR EQUIPO
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

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
            <form.Field name="video_url">
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

          <form.Field name="image_url">
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
