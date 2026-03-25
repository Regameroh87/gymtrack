import { View, Text, TextInput } from "react-native";
import { useForm } from "@tanstack/react-form";
import { useColorScheme } from "nativewind";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

// Constants
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
} from "../../../src/constants/exerciseOptions";

// Shared components
import CustomSelect from "../../../src/components/CustomSelect";
import InputUploadVideo from "../../../src/components/videos/InputUploadVideo";

// Form-specific sub-components
import FormField from "../../../src/components/forms/addExercise/FormField";
import StyledTextInput from "../../../src/components/forms/addExercise/StyledTextInput";
import YouTubeVideoCard from "../../../src/components/forms/addExercise/YouTubeVideoCard";
import ImagePickerCard from "../../../src/components/forms/addExercise/ImagePickerCard";
import UnilateralToggle from "../../../src/components/forms/addExercise/UnilateralToggle";
import SubmitButton from "../../../src/components/forms/addExercise/SubmitButton";

// Icons & theme
import { Barbell } from "../../../assets/icons";
import { ui } from "../../../src/theme/colors";

// Hooks
import { useMediaPicker } from "../../../src/hooks/useMediaPicker";

export default function AddExercise() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      muscle_group: "",
      equipment: "",
      custom_video_url: "",
      cloudinary_public_id: "",
      youtube_video_url: "",
      image_url: "",
      instructions: "",
      is_unilateral: false,
    },
    onSubmit: (data) => {
      console.log(data);
    },
  });

  const { pickMedia } = useMediaPicker();

  const handlePickImage = async () => {
    const result = await pickMedia();
    if (result) {
      form.setFieldValue("image_url", result.uri);
    }
  };

  return (
    <KeyboardAwareScrollView className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      {/* ── Header ── */}
      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-jakarta tracking-editorial text-ui-text-main dark:text-ui-text-mainDark">
          Nuevo Ejercicio
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
          Completá los datos para agregar un ejercicio al catálogo.
        </Text>
      </View>

      {/* ── Form ── */}
      <View className="px-5 pt-4 pb-8">
        {/* Nombre */}
        <FormField label="NOMBRE DEL EJERCICIO">
          <form.Field name="name">
            {(field) => (
              <StyledTextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Ej: Press de Banca con Mancuernas"
              />
            )}
          </form.Field>
        </FormField>

        {/* Categoría + Grupo Muscular */}
        <View className="flex-row w-full justify-center gap-3 mb-5">
          <View className="w-1/2">
            <form.Field name="category">
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
          <form.Field name="equipment">
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
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          {/* Video local */}
          <View className="rounded-2xl p-5 mb-4 border border-brandPrimary-600 border-l-4">
            <form.Field name="custom_video_url">
              {(field) => (
                <InputUploadVideo
                  value={field.state.value}
                  onChange={field.handleChange}
                  publicId={form.getFieldValue("cloudinary_public_id")}
                  onIdChange={(id) =>
                    form.setFieldValue("cloudinary_public_id", id)
                  }
                />
              )}
            </form.Field>
          </View>

          {/* Imagen */}
          <form.Field name="image_url">
            {(field) => (
              <ImagePickerCard
                value={field.state.value}
                onChange={field.handleChange}
                onPickImage={handlePickImage}
              />
            )}
          </form.Field>
        </View>

        {/* ── Instrucciones ── */}
        <FormField label="INSTRUCCIONES" className="mt-6">
          <form.Field name="instructions">
            {(field) => (
              <TextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Describe los pasos detalladamente..."
                placeholderTextColor={ui.text.muted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="font-manrope p-4 bg-ui-surface-light dark:bg-ui-surface-dark text-ui-text-main dark:text-ui-text-mainDark text-sm"
                style={{ borderRadius: 12, minHeight: 104 }}
              />
            )}
          </form.Field>
        </FormField>

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
