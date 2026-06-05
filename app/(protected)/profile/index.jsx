import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "../../../src/database/supabase";
import { useAuth } from "../../../src/auth/lib/getSession";
import { useUserRole } from "../../../src/hooks/shared/use-user-role";
import { uploadFileToCloudinary } from "../../../src/utils/uploadFileToCloudinary";
import { getCloudinaryUrl } from "../../../src/utils/cloudinary";
import { ROLE_LABELS } from "../../../src/constants/roles";
import {
  brandPrimary,
  brandSecondary,
  gradient,
  ui,
} from "../../../src/theme/colors";
import {
  Mail,
  Phone,
  IdBadge,
  MapPin,
  Polaroid,
  Pencil,
} from "../../../assets/icons";
import Screen from "../../../src/components/Screen";

const norm = (s) => (s ? s.trim().toLowerCase() : null);

const BRAND = brandPrimary[700];
const MINT = brandSecondary[400];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userId, refreshProfile } = useAuth();
  const { role } = useUserRole();

  const fullName =
    [user?.name, user?.last_name].filter(Boolean).join(" ") || "";
  const initials =
    `${user?.name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() ||
    "?";
  const roleLabel = ROLE_LABELS[role] ?? role ?? "";

  const [form, setForm] = useState({
    name: user?.name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    document_number: user?.document_number ?? "",
    address: user?.address ?? "",
  });

  const [localImageUri, setLocalImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const cloudUrl = getCloudinaryUrl(user?.image_profile);
  const hasPhoto = !!localImageUri || !!cloudUrl;

  const avatarSource = localImageUri
    ? { uri: localImageUri }
    : cloudUrl
      ? { uri: cloudUrl }
      : null;

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
      //contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={{ paddingTop: insets.top }}>
        <LinearGradient
          colors={gradient.hero.light}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Avatar */}
        <View className="items-center pb-8 px-5">
          <Pressable onPress={pickImage} className="mb-5 active:scale-[0.96]">
            <LinearGradient
              colors={[MINT, BRAND]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 28,
                padding: 2.5,
                shadowColor: BRAND,
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <View
                className="flex-1 rounded-[23px] overflow-hidden items-center justify-center"
                style={{
                  backgroundColor: hasPhoto ? "transparent" : brandPrimary[50],
                }}
              >
                {hasPhoto && avatarSource ? (
                  <Image
                    source={avatarSource}
                    width={"100%"}
                    height={"100%"}
                    style={{ borderRadius: 30 }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <Text
                    className="font-jakarta-bold text-brandPrimary-600"
                    style={{ fontSize: 28 }}
                  >
                    {initials}
                  </Text>
                )}
              </View>
            </LinearGradient>

            {/* Badge editar */}
            <View
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-[9px] items-center justify-center border-2 border-white dark:border-ui-background-dark"
              style={{ backgroundColor: BRAND }}
            >
              <Polaroid size={12} color="white" />
            </View>
          </Pressable>

          {/* Nombre */}
          <Text
            className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark capitalize text-center tracking-tight"
            style={{ fontSize: 22, lineHeight: 28 }}
          >
            {fullName || "Sin nombre"}
          </Text>

          {/* Rol */}
          {roleLabel ? (
            <View className="mt-2.5 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-brandPrimary-50 dark:bg-brandPrimary-900/40 border border-brandPrimary-100 dark:border-brandPrimary-700/40">
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: BRAND }}
              />
              <Text className="text-[10px] font-jakarta-bold uppercase tracking-widest text-brandPrimary-600 dark:text-brandPrimary-300">
                {roleLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Divisor */}
      <View className="h-px mx-4 mb-6 bg-ui-text-main/[6%] dark:bg-white/[6%]" />

      {/* ── Cuenta ── */}
      <SectionTitle>Cuenta</SectionTitle>
      <View className="mx-4 mb-6 bg-white dark:bg-ui-surface-dark border border-ui-text-main/[6%] dark:border-white/[6%] rounded-2xl overflow-hidden">
        <View className="flex-row items-center px-4 py-4">
          <IconBox color={BRAND}>
            <Mail size={14} color={BRAND} />
          </IconBox>
          <View className="flex-1">
            <Text className="text-[9px] font-manrope-bold uppercase tracking-[1.4px] text-ui-text-muted mb-[3px]">
              Email
            </Text>
            <Text
              className="text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
              numberOfLines={1}
            >
              {user?.email ?? "—"}
            </Text>
          </View>
          <View className="px-2 py-1 rounded-full bg-ui-text-main/5 dark:bg-white/[7%]">
            <Text className="text-[9px] font-manrope-bold uppercase tracking-[0.8px] text-ui-text-muted">
              Solo lectura
            </Text>
          </View>
        </View>
      </View>

      {/* ── Datos personales ── */}
      <SectionTitle>Datos personales</SectionTitle>
      <View className="mx-4 mb-7 bg-white dark:bg-ui-surface-dark border border-ui-text-main/[6%] dark:border-white/[6%] rounded-2xl overflow-hidden">
        <FieldRow
          icon={<Pencil size={14} color={BRAND} />}
          label="Nombre"
          value={form.name}
          placeholder="Ej: Juan Pablo"
          onChangeText={set("name")}
          autoCapitalize="words"
        />
        <FieldRow
          icon={<Pencil size={14} color={BRAND} />}
          label="Apellido"
          value={form.last_name}
          placeholder="Ej: Pérez García"
          onChangeText={set("last_name")}
          autoCapitalize="words"
        />
        <FieldRow
          icon={<Phone size={14} color={BRAND} />}
          label="Teléfono"
          value={form.phone}
          placeholder="123456789"
          onChangeText={set("phone")}
          keyboardType="phone-pad"
        />
        <FieldRow
          icon={<IdBadge size={14} color={BRAND} />}
          label="N° de documento"
          value={form.document_number}
          placeholder="12345678"
          onChangeText={set("document_number")}
          keyboardType="numeric"
        />
        <FieldRow
          icon={<MapPin size={14} color={BRAND} />}
          label="Dirección"
          value={form.address}
          placeholder="Ej: Calle 123"
          onChangeText={set("address")}
          last
        />
      </View>

      {/* ── Acciones ── */}
      <View className="mx-4 gap-3">
        <Pressable
          onPress={onSave}
          disabled={saving}
          className="overflow-hidden rounded-2xl active:opacity-80"
          style={{
            shadowColor: BRAND,
            shadowOpacity: 0.45,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={gradient.button.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 16,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-[15px] font-jakarta-bold text-white tracking-tight">
                Guardar cambios
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onLogout}
          className="items-center py-4 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/60 dark:bg-red-950/20 active:opacity-70"
        >
          <Text className="text-[14px] font-manrope-bold text-red-500">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Subcomponentes ──

function SectionTitle({ children }) {
  return (
    <Text className="px-4 mb-2.5 text-[10px] font-jakarta-bold uppercase tracking-[2px] text-brandPrimary-600 dark:text-brandPrimary-400">
      {children}
    </Text>
  );
}

function IconBox({ color, children }) {
  return (
    <View
      className="w-8 h-8 rounded-xl items-center justify-center mr-3"
      style={{ backgroundColor: `${color}15` }}
    >
      {children}
    </View>
  );
}

function FieldRow({ icon, label, value, onChangeText, last, ...inputProps }) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        last ? "" : "border-b border-ui-text-main/5 dark:border-white/5"
      }`}
    >
      <IconBox color={brandPrimary[700]}>{icon}</IconBox>
      <View className="flex-1">
        <Text className="text-[9px] font-manrope-bold uppercase tracking-[1.4px] text-ui-text-muted mb-[3px]">
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={ui.placeholder.light}
          className="text-[14px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
          style={{ padding: 0, margin: 0 }}
          {...inputProps}
        />
      </View>
    </View>
  );
}
