import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useRef, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { database } from "../../database";
import { exercises_base, equipment } from "../../database/schemas";
import useAsyncStorage from "../../hooks/useAsyncStorage";
import { getCloudinaryUrl } from "../../utils/cloudinary";
import { eq } from "drizzle-orm";

// Constants
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
} from "../../constants/exerciseOptions";

// Shared components
import CustomSelect from "../CustomSelect";
import InputUploadVideo from "../videos/InputUploadVideo";
import AddEquipment from "./FormEquipment";

// Form-specific sub-components
import FormField from "./FormField";
import StyledTextInput from "./StyledTextInput";
import YouTubeVideoCard from "./YouTubeVideoCard";
import ImagePickerCard from "./ImagePickerCard";
import UnilateralToggle from "./UnilateralToggle";
import SubmitButton from "./SubmitButton";

// Icons & theme
import { ui } from "../../theme/colors";
import { Trash } from "../../../assets/icons";
import { Image } from "expo-image";

//Debo Agregar la función que pueda recibir un ejercicio y editarlo
export default function FormExercise({
  exercise,
  headerTitle,
  headerDescription,
  form,
}) {
  const [isCreatingEquipment, setIsCreatingEquipment] = useState(false);
  const [initialEquipmentName, setInitialEquipmentName] = useState("");
  const { data: dbEquipments = [] } = useQuery({
    queryKey: ["equipments"],
    queryFn: async () => {
      const results = await database.select().from(equipment);
      return results || [];
    },
  });

  useAsyncStorage({
    form,
    storageKey: "addExerciseDraft",
    enabled: !exercise,
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

  const renderEquipmentItem = ({ item, index }, field) => (
    <View
      key={index}
      className="flex-row relative p-2 gap-x-2 w-1/2 items-center bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark rounded-xl border border-ui-input-light dark:border-ui-input-dark"
    >
      <View className=" flex w-10 h-10 rounded-lg overflow-hidden">
        <Image
          source={{
            uri: getCloudinaryUrl(item.image_uri) ?? item.image_uri,
          }}
          width={"100%"}
          height={"100%"}
          contentFit="cover"
        />
      </View>
      <View className=" flex">
        <Text className="text-xs font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest ">
          EQUIPO
        </Text>
        <Text className="text-xs font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark">
          {item.name}
        </Text>
      </View>
      <View className=" absolute top-2 right-2">
        <Pressable
          onPress={() => {
            const newList = [...field.state.value];
            newList.splice(index, 1);
            field.handleChange(newList);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          className=" active:scale-95 transition-all duration-200"
        >
          <Trash color="#ef4444" size={14} />
        </Pressable>
      </View>
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
          {headerTitle ? headerTitle : "Nuevo Ejercicio"}
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
          {headerDescription
            ? headerDescription
            : "Completá los datos para agregar un ejercicio al catálogo."}
        </Text>
      </View>

      {/* ── Form ── */}
      <View className="px-4 pt-4 pb-8">
        {/* Nombre */}
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
            onChangeAsync: async ({ value }) => {
              if (!value || value.trim().length < 3) return undefined;

              const existing = await database
                .select()
                .from(exercises_base)
                .where(eq(exercises_base.name, value.trim()));

              if (existing.length > 0) {
                return "Ya existe un ejercicio con este nombre.";
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <FormField
              label="NOMBRE DEL EJERCICIO"
              error={field.state.meta.errors?.[0]}
            >
              <StyledTextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Ej: Press de Banca"
                error={field.state.meta.errors?.length > 0}
              />
            </FormField>
          )}
        </form.Field>

        {/* Categoría + Grupo Muscular */}
        <View className="flex-row w-full justify-center gap-3">
          <View className="flex-1">
            <form.Field
              name="category"
              validators={{
                onSubmit: ({ value }) => {
                  if (!value) return "La categoría es requerida";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <CustomSelect
                  label="CATEGORÍA"
                  options={EXERCISE_CATEGORIES}
                  value={field.state.value}
                  onChange={field.handleChange}
                  error={field.state.meta.errors?.[0]}
                />
              )}
            </form.Field>
          </View>
          <View className="flex-1">
            <form.Field
              name="muscle_group"
              validators={{
                onSubmit: ({ value }) => {
                  if (!value) return "El grupo muscular es requerido";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <CustomSelect
                  label="GRUPO MUSCULAR"
                  options={MUSCLE_GROUPS}
                  value={field.state.value}
                  onChange={field.handleChange}
                  error={field.state.meta.errors?.[0]}
                />
              )}
            </form.Field>
          </View>
        </View>

        {/* Equipo */}
        <form.Field name="equipments">
          {(field) => (
            <>
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
                          image_uri: selectedEq.image_uri,
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
              {/* Lista de equipos agregados con FlatList */}
              {field.state.value.length > 0 && (
                <View className="mb-2">
                  <FlatList
                    data={field.state.value}
                    renderItem={(props) => renderEquipmentItem(props, field)}
                    keyExtractor={(_, index) => index.toString()}
                    className="flex w-full"
                    numColumns={2}
                    columnWrapperClassName="mb-3 gap-2 justify-center px-1"
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
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

          <form.Field
            name="video_uri"
            validators={{
              onSubmit: ({ value }) => {
                if (!value) {
                  return "El video es requerido";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <View ref={uploadVideoCardRef}>
                <View
                  className={`rounded-2xl mb-4 border-l-4 border border-1 ${
                    field.state.meta.errors?.length > 0
                      ? "border-red-500 bg-red-50/10"
                      : "border-brandPrimary-600"
                  }`}
                >
                  <InputUploadVideo
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                </View>
                {field.state.meta.errors?.length > 0 && (
                  <Text className="text-red-500 dark:text-red-400 text-[11px] mb-4 ml-4 font-manrope-semi italic">
                    {field.state.meta.errors[0]}
                  </Text>
                )}
              </View>
            )}
          </form.Field>

          {/* Imagen de portada Ejercicio */}
          <form.Field
            name="image_uri"
            validators={{
              onSubmit: ({ value }) => {
                if (!value) {
                  return "La imagen es requerida";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <View>
                <ImagePickerCard
                  ref={imageCardRef}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onFocus={() => scrollToCard(imageCardRef)}
                  error={field.state.meta.errors?.length > 0}
                />
                {field.state.meta.errors?.length > 0 && (
                  <Text className="text-red-500 dark:text-red-400 text-[11px] mt-1 ml-1 font-manrope-semi italic">
                    {field.state.meta.errors[0]}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </View>

        {/* Instrucciones */}
        <View ref={instructionsRef}>
          <form.Field
            name="instructions"
            validators={{
              onSubmit: ({ value }) => {
                if (!value) return "Las instrucciones son requeridas";
                return undefined;
              },
            }}
          >
            {(field) => (
              <FormField
                label="INSTRUCCIONES"
                className="mt-6"
                error={field.state.meta.errors?.[0]}
              >
                <TextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onFocus={() => scrollToCard(instructionsRef)}
                  placeholder="Describe los pasos detalladamente..."
                  placeholderTextColor={ui.text.muted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className={`font-manrope rounded-xl min-h-28 p-4 bg-ui-surface-light dark:bg-ui-surface-dark text-ui-text-main dark:text-ui-text-mainDark text-sm border ${
                    field.state.meta.errors?.length > 0
                      ? "border-red-500/50"
                      : "border-transparent"
                  }`}
                />
              </FormField>
            )}
          </form.Field>
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
