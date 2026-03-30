import { View, Text, TextInput } from "react-native";
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { z } from "zod";

// Constants
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
} from "../../../src/constants/exerciseOptions";

// Shared components
import CustomSelect from "../../../src/components/CustomSelect";
import InputUploadVideo from "../../../src/components/videos/InputUploadVideo";

// Form-specific sub-components
import FormField from "../../../src/components/forms/FormField";
import StyledTextInput from "../../../src/components/forms/StyledTextInput";
import YouTubeVideoCard from "../../../src/components/forms/YouTubeVideoCard";
import ImagePickerCard from "../../../src/components/forms/ImagePickerCard";
import UnilateralToggle from "../../../src/components/forms/UnilateralToggle";
import SubmitButton from "../../../src/components/forms/SubmitButton";

// Icons & theme
import { Barbell } from "../../../assets/icons";
import { ui } from "../../../src/theme/colors";

export default function AddExercise() {
  //const { colorScheme } = useColorScheme();
  //const isDark = colorScheme === "dark";

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      muscle_group: "",
      equipment: "",
      video_url: "",
      video_public_id: "",
      youtube_video_url: "",
      image_url: "",
      image_public_id: "",
      instructions: "",
      is_unilateral: false,
    },
    onSubmit: (data) => {
      console.log(data);
    },
  });

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
                const result = z
                  .string()
                  .min(1, "El nombre es requerido")
                  .min(3, "Mínimo 3 caracteres")
                  .safeParse(value);
                return result.success
                  ? undefined
                  : result.error.errors[0].message;
              },
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: Press de Banca con Mancuernas"
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
        <FormField label="EQUIPO">
          <form.Field
            name="equipment"
            validators={{
              onChange: ({ value }) => {
                return z
                  .string()
                  .maxLength(
                    150,
                    "El equipo debe tener menos de 150 caracteres"
                  )
                  .required("El equipo es requerido")
                  .safeParse(value);
              },
            }}
          >
            {(field) => (
              <StyledTextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Ej: Barbell, Dumbbell"
                icon={<Barbell color={ui.text.mutedDark} />}
              />
            )}
          </form.Field>
        </FormField>

        {/* ── Multimedia ── */}
        <View className="mt-4">
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-4 uppercase tracking-label">
            MULTIMEDIA
          </Text>

          {/* YouTube */}
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

          {/* Video local */}
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

          {/* Imagen */}
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

        {/* ── Instrucciones ── */}
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

        {/* ── Toggle Unilateral ── */}
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

        {/* ── Submit ── */}
        <SubmitButton onPress={() => form.handleSubmit()} />
      </View>
    </KeyboardAwareScrollView>
  );
}
