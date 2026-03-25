import {
  View,
  TextInput,
  Text,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { useForm } from "@tanstack/react-form";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import CustomSelect from "../../../src/components/CustomSelect";
import {
  Barbell,
  Photo,
  Upload,
  Link,
  SwitchHorizontal,
  Play,
} from "../../../assets/icons";
import { ui, brandPrimary, brandSecondary } from "../../../src/theme/colors";
import InputUploadVideo from "../../../src/components/videos/InputUploadVideo";
import PreviewVideo from "../../../src/components/videos/PreviewVideo";
/* import { useMediaPicker } from "../../../src/hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../../src/utils/uploadFileToCloudinary";
import PreviewVideo from "../../../src/components/videos/PreviewVideo"; */

export default function AddExercise() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const categories = [
    { label: "Fuerza", value: "fuerza" },
    { label: "Cardio", value: "cardio" },
    { label: "Flexibilidad", value: "flexibilidad" },
    { label: "Potencia", value: "potencia" },
  ];

  const muscleGroups = [
    { label: "Pecho", value: "pecho" },
    { label: "Espalda", value: "espalda" },
    { label: "Piernas", value: "piernas" },
    { label: "Hombros", value: "hombros" },
    { label: "Brazos", value: "brazos" },
    { label: "Core", value: "core" },
  ];

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

  return (
    <ScrollView className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      {/* ── Header Section ── */}
      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-jakarta tracking-editorial text-ui-text-main dark:text-ui-text-mainDark">
          Nuevo Ejercicio
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
          Completá los datos para agregar un ejercicio al catálogo.
        </Text>
      </View>

      {/* ── Form Content ── */}
      <View className="px-5 pt-4 pb-8">
        {/* Name Field */}
        <View className="mb-5">
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
            NOMBRE DEL EJERCICIO
          </Text>
          <form.Field name="name">
            {(field) => (
              <TextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Ej: Press de Banca con Mancuernas"
                placeholderTextColor={ui.text.muted}
                className="bg-ui-surface-highLight dark:bg-ui-surface-highDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope"
                style={{
                  borderWidth: 1,
                  borderColor: ui.input.border,
                }}
              />
            )}
          </form.Field>
        </View>

        {/* Category & Muscle Group — side by side */}
        <View className="flex-row w-full justify-center gap-3">
          <View className="w-1/2">
            <form.Field name="category">
              {(field) => (
                <CustomSelect
                  label="CATEGORÍA"
                  options={categories}
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
                  options={muscleGroups}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </View>
        </View>

        {/* Equipment Field */}
        <View className="mb-5">
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
            EQUIPO
          </Text>
          <form.Field name="equipment">
            {(field) => (
              <View className="flex relative">
                <View className="absolute top-0 left-1 translate-y-1/2 z-10 rotate-45">
                  <Barbell color={ui.text.mutedDark} />
                </View>
                <View>
                  <TextInput
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    placeholder="Ej: Barbell, Dumbbell"
                    placeholderTextColor={ui.text.muted}
                    className="bg-ui-surface-highLight dark:bg-ui-surface-highDark pl-10 rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope"
                    style={{
                      borderWidth: 1,
                      borderColor: ui.input.border,
                    }}
                  />
                </View>
              </View>
            )}
          </form.Field>
        </View>

        {/* ── Multimedia Section ── */}
        <View className="mt-4">
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-4 uppercase tracking-label">
            MULTIMEDIA
          </Text>

          {/* YouTube Video Card */}
          <View
            className="rounded-2xl p-5 mb-4 border border-brandPrimary-400 border-l-4"
            style={{
              backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center mb-5">
              <Play color={brandPrimary[400]} size={20} />
              <Text className="font-jakarta-bold ml-3 text-ui-text-main dark:text-slate-300 text-xs">
                YouTube Video
              </Text>
            </View>

            <form.Field name="youtube_video_url">
              {(field) => (
                <>
                  {/* Preview — gradient placeholder */}
                  <View
                    className="items-center justify-center overflow-hidden mb-4 bg-ui-surface-dimLight dark:bg-slate-950"
                    style={{
                      borderRadius: 8,
                      height: 172,
                    }}
                  >
                    <PreviewVideo videoUrl={field.state.value}>
                      <View className=" w-12 h-12 rounded-full dark:bg-slate-50 bg-brandPrimary-600 items-center justify-center">
                        <Play
                          color={isDark ? brandPrimary[600] : "#ffffff"}
                          size={25}
                        />
                      </View>
                    </PreviewVideo>
                  </View>

                  {/* URL Input */}
                  <View
                    className="flex-row items-center overflow-hidden bg-ui-surface-highLight dark:bg-ui-surface-highDark"
                    style={{
                      borderRadius: 12,
                      height: 41,
                    }}
                  >
                    <View className="pl-4">
                      <Link color={ui.text.muted} size={15} />
                    </View>
                    <TextInput
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      placeholder="Pegar URL de YouTube..."
                      placeholderTextColor={ui.text.muted}
                      className="flex-1 px-3 font-manrope text-ui-text-main dark:text-ui-text-mainDark text-xs"
                    />
                  </View>
                </>
              )}
            </form.Field>
          </View>

          {/* Local/Custom Video Card */}
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

          {/* ── Imagen de Referencia Card ── */}
          <View
            className="rounded-2xl p-5 mb-4 border border-brandSecondary-600 border-l-4"
            style={{
              backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center mb-5">
              <Photo
                color={isDark ? brandSecondary[300] : brandSecondary[500]}
                size={18}
              />
              <Text className="font-jakarta-bold ml-3 text-ui-text-main dark:text-slate-300 text-xs">
                Imagen de Referencia
              </Text>
            </View>

            {/* Preview placeholder */}
            <View
              className="items-center justify-center mb-4 bg-ui-surface-dimLight dark:bg-slate-950"
              style={{
                borderRadius: 8,
                height: 162,
              }}
            >
              <Photo color={isDark ? "#334155" : ui.text.muted} size={33} />
              <Text className="font-manrope-bold mt-2 text-ui-text-muted dark:text-slate-700 text-tiny">
                Sin Previsualización
              </Text>
            </View>

            {/* URL Input */}
            <form.Field name="image_url">
              {(field) => (
                <View
                  className="flex-row items-center overflow-hidden mb-3 bg-ui-surface-highLight dark:bg-ui-surface-highDark"
                  style={{
                    borderRadius: 12,
                    height: 41,
                  }}
                >
                  <View className="pl-4">
                    <Link color={ui.text.muted} size={15} />
                  </View>
                  <TextInput
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    placeholder="Pegar URL de la imagen..."
                    placeholderTextColor={ui.text.muted}
                    className="flex-1 px-3 font-manrope text-ui-text-main dark:text-ui-text-mainDark text-xs"
                  />
                </View>
              )}
            </form.Field>

            {/* Upload button — teal/mint */}
            <Pressable
              className="active:scale-[0.97] bg-brandSecondary-500 dark:bg-brandSecondary-700"
              style={{
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 24,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Upload
                color={isDark ? brandSecondary[300] : "#ffffff"}
                size={15}
              />
              <Text className="font-manrope-semi text-white dark:text-brandSecondary-300 text-xs">
                Subir imagen desde galería
              </Text>
            </Pressable>

            {/* Helper text */}
            <Text className="font-manrope mt-3 text-center text-ui-text-muted text-tiny">
              Referencia visual clara para asegurar la técnica correcta.
            </Text>
          </View>
        </View>

        {/* ── Section - Instructions ── */}
        <View className="mt-6">
          <Text className="font-manrope-bold mb-2 uppercase text-ui-text-muted text-tiny">
            Instrucciones
          </Text>
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
                style={{
                  borderRadius: 12,
                  minHeight: 104,
                }}
              />
            )}
          </form.Field>
        </View>

        {/* ── Section - Toggle Switch (Unilateral) ── */}
        <View className="mt-6">
          <form.Field name="is_unilateral">
            {(field) => (
              <View
                className="flex-row items-center justify-between rounded-2xl bg-ui-surface-light dark:bg-ui-surface-dark"
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <SwitchHorizontal
                    color={isDark ? brandSecondary[300] : brandSecondary[500]}
                    size={20}
                  />
                  <Text className="font-manrope-semi ml-3 text-ui-text-main dark:text-ui-text-mainDark text-sm">
                    ¿Es un ejercicio unilateral?
                  </Text>
                </View>
                <Switch
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  trackColor={{
                    false: isDark ? ui.surface.highDark : ui.surface.dimLight,
                    true: brandPrimary[600],
                  }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={
                    isDark ? ui.surface.highDark : ui.surface.dimLight
                  }
                />
              </View>
            )}
          </form.Field>
        </View>

        {/* ── Submit Button — Kinetic Gradient ── */}
        <Pressable
          onPress={() => form.handleSubmit()}
          className="mt-8 active:scale-[0.97]"
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#3023cd", "#4a44e4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 20,
              paddingHorizontal: 32,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              shadowColor: "#312e81",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.4,
              shadowRadius: 25,
              elevation: 8,
            }}
          >
            <Text className="font-jakarta-bold text-white text-lg">
              Guardar Ejercicio
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}
