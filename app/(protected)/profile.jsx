import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../src/database/supabase";
import { useAuth } from "../../src/auth/lib/getSession";
import { uploadFileToCloudinary } from "../../src/utils/uploadFileToCloudinary";
import { getCloudinaryUrl } from "../../src/utils/cloudinary";
import FormField from "../../src/components/forms/FormField";
import StyledTextInput from "../../src/components/forms/StyledTextInput";
import SubmitButton from "../../src/components/forms/SubmitButton";
import { Phone, IdBadge, MapPin, Mail, Polaroid } from "../../assets/icons";
import { ui } from "../../src/theme/colors";

const norm = (s) => (s ? s.trim().toLowerCase() : null);

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userId, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    name: user?.name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    document_number: user?.document_number ?? "",
    address: user?.address ?? "",
  });

  // URI temporal elegida del picker; se sube al guardar (no en la selección).
  const [localImageUri, setLocalImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const avatarSource = () => {
    if (localImageUri) return { uri: localImageUri };
    const url = getCloudinaryUrl(user?.image_profile);
    if (url) return { uri: url };
    return require("../../assets/profile.png");
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a tu galería para cambiar la foto."
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
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      let imageProfileUpdate;

      if (localImageUri) {
        try {
          const { public_id } = await uploadFileToCloudinary({
            fileUri: localImageUri,
            uploadPreset: "gymtrack_images",
            typeFile: "image",
          });
          imageProfileUpdate = public_id;
        } catch {
          Toast.show({
            type: "error",
            text1: "Error al subir la foto",
            position: "bottom",
          });
          setSaving(false);
          return;
        }
      }

      const payload = {
        name: norm(form.name),
        last_name: norm(form.last_name),
        phone: form.phone?.trim() || null,
        document_number: form.document_number?.trim() || null,
        address: norm(form.address),
        ...(imageProfileUpdate !== undefined && {
          image_profile: imageProfileUpdate,
        }),
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", userId);

      if (error) throw error;

      await refreshProfile();
      setLocalImageUri(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "Perfil actualizado",
        position: "bottom",
      });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: "No se pudo guardar",
        text2: e?.message,
        position: "bottom",
      });
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="px-5 pt-6 mb-6">
        <Text className="text-2xl font-jakarta-bold tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
          Mi perfil
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted mt-1">
          Editá tus datos personales
        </Text>
      </View>

      {/* Avatar */}
      <View className="items-center mb-8">
        <Pressable onPress={pickImage} className="active:opacity-75">
          <View className="relative">
            <Image
              source={avatarSource()}
              style={{ width: 96, height: 96, borderRadius: 28 }}
              contentFit="cover"
              transition={200}
            />
            <View className="absolute -bottom-2 -right-2 bg-brandPrimary-600 w-8 h-8 rounded-xl items-center justify-center border-2 border-white dark:border-ui-background-dark">
              <Polaroid size={14} color="#fff" />
            </View>
          </View>
        </Pressable>
      </View>

      <View className="mx-5 gap-y-4">
        {/* Email solo lectura */}
        <FormField label="EMAIL">
          <View className="flex-row items-center gap-2.5 bg-ui-secondary-light dark:bg-ui-secondary-dark rounded-xl px-4 py-3.5 opacity-60">
            <Mail size={16} color={ui.text.muted} />
            <Text
              className="text-sm font-manrope text-ui-text-muted flex-1"
              numberOfLines={1}
            >
              {user?.email ?? "—"}
            </Text>
          </View>
        </FormField>

        <FormField label="NOMBRE(S)">
          <StyledTextInput
            placeholder="Ej: Juan Pablo"
            value={form.name}
            onChangeText={set("name")}
          />
        </FormField>

        <FormField label="APELLIDO(S)">
          <StyledTextInput
            placeholder="Ej: Pérez García"
            value={form.last_name}
            onChangeText={set("last_name")}
          />
        </FormField>

        <FormField label="TELÉFONO">
          <StyledTextInput
            placeholder="123456789"
            icon={<Phone color={ui.text.mutedDark} />}
            value={form.phone}
            onChangeText={set("phone")}
            keyboardType="numeric"
          />
        </FormField>

        <FormField label="N° DE DOCUMENTO">
          <StyledTextInput
            placeholder="12345678"
            icon={<IdBadge color={ui.text.mutedDark} />}
            value={form.document_number}
            onChangeText={set("document_number")}
            keyboardType="numeric"
          />
        </FormField>

        <FormField label="DIRECCIÓN">
          <StyledTextInput
            placeholder="Ej: Calle 123"
            icon={<MapPin color={ui.text.mutedDark} />}
            value={form.address}
            onChangeText={set("address")}
          />
        </FormField>
      </View>

      {/* Acciones */}
      <View className="mx-5 mt-10 gap-3">
        <SubmitButton
          onPress={onSave}
          isLoading={saving}
          title="Guardar cambios"
        />

        <Pressable
          onPress={onLogout}
          className="items-center py-3.5 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 active:opacity-70"
        >
          <Text className="text-sm font-manrope-bold text-red-500">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
