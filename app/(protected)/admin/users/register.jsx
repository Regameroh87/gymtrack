import {
  View,
  Text,
  Image,
  Pressable,
} from "react-native";
import { useRef } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { supabase } from "../../../../src/database/supabase";
import * as ImagePicker from "expo-image-picker";
import {
  Polaroid,
  Mail,
  Phone,
  IdBadge,
  MapPin,
  UserPlus,
} from "../../../../assets/icons.jsx";
import { uploadToCloudinary } from "../../../../src/utils/uploadFileToCloudinary.js";
import { ui, brandPrimary } from "../../../../src/theme/colors";

// Shared components
import FormField from "../../../../src/components/forms/FormField";
import StyledTextInput from "../../../../src/components/forms/StyledTextInput";
import SubmitButton from "../../../../src/components/forms/SubmitButton";

export default function RegisterUser() {
  const scrollRef = useRef(null);

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      last_name: "",
      image_profile: "",
      phone: "",
      document_number: "",
      address: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const response = await supabase.functions.invoke("crear-socio", {
          body: value,
        });

        if (response.error) {
          let errorMsg = "Ha ocurrido un error inesperado.";
          if (response.error.context) {
            try {
              const body = await response.error.context.json();
              if (body && body.error) errorMsg = body.error;
            } catch (e) {}
          }
          throw new Error(errorMsg);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Éxito!",
          text2: "Usuario registrado exitosamente.",
          position: "bottom",
        });
        form.reset();
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } catch (error) {
        console.error(error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message,
          position: "bottom",
        });
      }
    },
  });

  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Necesitamos permisos para acceder a la galería");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const URL = await uploadToCloudinary(result.assets[0].uri);
      field.handleChange(URL);
    }
  };

  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
    >
      {/* ── Photo Picker ── */}
      <View className="items-center mb-8">
        <form.Field name="image_profile">
          {(field) => (
            <Pressable
              onPress={() => pickImage(field)}
              className="items-center justify-center active:scale-95 transition-all"
            >
              <View className="relative">
                {field.state.value ? (
                  <View className="w-24 h-24 rounded-full border-4 border-brandPrimary-500 overflow-hidden shadow-lg">
                    <Image
                      source={{ uri: field.state.value }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View className="w-24 h-24 rounded-full bg-brandPrimary-100 dark:bg-brandPrimary-900/30 items-center justify-center border-2 border-dashed border-brandPrimary-400">
                    <Polaroid size={32} color={brandPrimary[500]} />
                  </View>
                )}
                <View className="absolute bottom-0 right-0 bg-brandPrimary-600 p-2 rounded-full border-2 border-white dark:border-ui-background-dark">
                  <UserPlus size={16} color="white" />
                </View>
              </View>
              <Text className="mt-4 font-jakarta text-xl text-ui-text-main dark:text-ui-text-mainDark">
                Foto de Perfil
              </Text>
              <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                Pulsa para elegir una imagen
              </Text>
            </Pressable>
          )}
        </form.Field>
      </View>

      {/* ── Form Fields ── */}
      <View className="gap-y-4">
        <FormField label="NOMBRE(S)">
          <form.Field
            name="name"
            validators={{
              onChange: z.string().min(3, "Mínimo 3 caracteres"),
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  placeholder="Ej: Juan Pablo"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-red-500 text-xs mt-1 font-manrope">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

        <FormField label="APELLIDO(S)">
          <form.Field
            name="last_name"
            validators={{
              onChange: z.string().min(2, "Mínimo 2 caracteres"),
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  placeholder="Ej: Pérez García"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-red-500 text-xs mt-1 font-manrope">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

        <FormField label="CORREO ELECTRÓNICO">
          <form.Field
            name="email"
            validators={{
              onChange: z.string().email("Correo inválido"),
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  placeholder="juan.perez@ejemplo.com"
                  icon={<Mail color={ui.text.mutedDark} />}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-red-500 text-xs mt-1 font-manrope">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

        <FormField label="TELÉFONO">
          <form.Field
            name="phone"
            validators={{
              onChange: z.string().min(8, "Mínimo 8 dígitos"),
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  placeholder="123456789"
                  icon={<Phone color={ui.text.mutedDark} />}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  keyboardType="numeric"
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-red-500 text-xs mt-1 font-manrope">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

        <FormField label="N° DE DOCUMENTO">
          <form.Field
            name="document_number"
            validators={{
              onChange: z.string().min(5, "N° de documento inválido"),
            }}
          >
            {(field) => (
              <View>
                <StyledTextInput
                  placeholder="12345678"
                  icon={<IdBadge color={ui.text.mutedDark} />}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  keyboardType="numeric"
                />
                {field.state.meta.errors.length > 0 && (
                  <Text className="text-red-500 text-xs mt-1 font-manrope">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                )}
              </View>
            )}
          </form.Field>
        </FormField>

        <FormField label="DIRECCIÓN">
          <form.Field name="address">
            {(field) => (
              <StyledTextInput
                placeholder="Ej: Calle 123"
                icon={<MapPin color={ui.text.mutedDark} />}
                value={field.state.value}
                onChangeText={field.handleChange}
              />
            )}
          </form.Field>
        </FormField>
      </View>

      {/* ── Submit ── */}
      <View className="mt-12">
        <SubmitButton
          onPress={() => form.handleSubmit()}
          isLoading={form.state.isSubmitting}
          title="Registrar Socio"
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
