// React Native
import { View, Text, Image, Pressable, Alert, ScrollView } from "react-native";

// Librerías
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

// BD
import { supabase } from "../../../../../src/database/supabase";

// Utils
import { uploadFileToCloudinary } from "../../../../../src/utils/uploadFileToCloudinary.js";

// Assets
import {
  Polaroid,
  Mail,
  Phone,
  IdBadge,
  MapPin,
  UserPlus,
} from "../../../../../assets/icons.jsx";

// Tema
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";

// Componentes
import FormField from "../../../../../src/components/forms/FormField";
import StyledTextInput from "../../../../../src/components/forms/StyledTextInput";
import SubmitButton from "../../../../../src/components/forms/SubmitButton";

// Roles
import { useUserRole } from "../../../../../src/hooks/shared/use-user-role";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  DEFAULT_ROLE,
} from "../../../../../src/constants/roles";
import { PROFILE_GENDERS } from "../../../../../src/constants/gender-options";

export default function RegisterUser() {
  const scrollRef = useRef(null);
  const { role: currentRole } = useUserRole();
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();

  // Roles que el usuario logueado puede asignar (estrictamente por debajo del suyo).
  // crear-socio revalida esto en el backend (defensa en profundidad).
  const assignableRoles = ASSIGNABLE_ROLES[currentRole] ?? [DEFAULT_ROLE];

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      last_name: "",
      image_profile: "",
      phone: "",
      document_number: "",
      address: "",
      gender: "",
      role: DEFAULT_ROLE,
    },
    onSubmit: async ({ value }) => {
      try {
        let image_profile = value.image_profile || null;

        if (image_profile?.startsWith("file://")) {
          try {
            const { public_id } = await uploadFileToCloudinary({
              fileUri: image_profile,
              uploadPreset: "gymtrack_images",
              typeFile: "image",
            });
            image_profile = public_id;
          } catch {
            image_profile = null;
          }
        }

        const response = await supabase.functions.invoke("crear-socio", {
          // gym_id: el gym activo del caller (multi-gym); el backend valida
          // contra memberships que realmente sea staff de ese gym.
          body: {
            ...value,
            image_profile,
            gender: value.gender || null,
            gym_id: gymId,
          },
        });

        if (response.error) {
          let errorMsg = "Ha ocurrido un error inesperado.";
          if (response.error.context) {
            try {
              const body = await response.error.context.json();
              if (body && body.error) errorMsg = body.error;
            } catch (e) {
              console.log(e);
            }
          }
          throw new Error(errorMsg);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Éxito!",
          text2: response.data?.linked_existing
            ? "Esta persona ya tenía cuenta: se la vinculó a tu gimnasio con sus datos existentes."
            : "Usuario registrado exitosamente.",
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
      Alert.alert(
        "Permiso requerido",
        "Necesitás permitir el acceso a la galería."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      field.handleChange(result.assets[0].uri);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
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

        <FormField label="GÉNERO (opcional)">
          <form.Field name="gender">
            {(field) => (
              <View className="flex-row flex-wrap gap-2">
                {PROFILE_GENDERS.map((g) => {
                  const active = field.state.value === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      onPress={() =>
                        field.handleChange(active ? "" : g.value)
                      }
                      className={`px-4 py-2 rounded-xl border ${
                        active
                          ? "bg-brandPrimary-600 border-brandPrimary-600"
                          : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                      }`}
                    >
                      <Text
                        className={`text-sm font-manrope-semi ${
                          active
                            ? "text-white"
                            : "text-ui-text-muted dark:text-ui-text-mutedDark"
                        }`}
                      >
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </form.Field>
        </FormField>

        {assignableRoles.length > 1 && (
          <FormField label="ROL">
            <form.Field name="role">
              {(field) => (
                <View className="flex-row flex-wrap gap-2">
                  {assignableRoles.map((r) => {
                    const active = field.state.value === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => field.handleChange(r)}
                        className={`px-4 py-2 rounded-xl border ${
                          active
                            ? "bg-brandPrimary-600 border-brandPrimary-600"
                            : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                        }`}
                      >
                        <Text
                          className={`text-sm font-manrope-semi ${
                            active
                              ? "text-white"
                              : "text-ui-text-muted dark:text-ui-text-mutedDark"
                          }`}
                        >
                          {ROLE_LABELS[r] ?? r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </form.Field>
          </FormField>
        )}
      </View>

      {/* ── Submit ── */}
      <View className="mt-12">
        <SubmitButton
          onPress={() => form.handleSubmit()}
          isLoading={form.state.isSubmitting}
          title="Registrar Socio"
        />
      </View>
    </ScrollView>
  );
}
