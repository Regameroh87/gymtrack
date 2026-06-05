import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { supabase } from "../../../../../src/database/supabase";
import { CLOUD_NAME } from "../../../../../src/utils/cloudinary";
import { brandPrimary, ui } from "../../../../../src/theme/colors";
import {
  Polaroid,
  Mail,
  Phone,
  IdBadge,
  MapPin,
  UserPlus,
  ArrowLeft,
  CheckCircle,
  X,
} from "../../../../../assets/icons";

const uploadImageWeb = async (file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "gymtrack_images");
  data.append("tags", "pending_approval");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: data }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Error al subir imagen");
  return json.public_id;
};

function Field({ label, error, children }) {
  return (
    <View className="gap-y-1.5">
      <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        {label}
      </Text>
      {children}
      {error && (
        <Text className="text-red-500 text-[11px] font-manrope">{error}</Text>
      )}
    </View>
  );
}

function Input({ icon, ...props }) {
  return (
    <View className="flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
      {icon}
      <TextInput
        {...props}
        className="flex-1 text-[13px] font-manrope text-ui-text-main"
        placeholderTextColor={ui.text.muted}
        style={{ outlineWidth: 0 }}
      />
    </View>
  );
}

export default function RegisterUserWeb() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      last_name: "",
      phone: "",
      document_number: "",
      address: "",
    },
    onSubmit: async ({ value }) => {
      try {
        let image_profile = null;
        if (selectedFile) {
          try {
            image_profile = await uploadImageWeb(selectedFile);
          } catch {
            image_profile = null;
          }
        }

        const response = await supabase.functions.invoke("crear-socio", {
          body: { ...value, image_profile },
        });

        if (response.error) {
          let msg = "Ha ocurrido un error inesperado.";
          if (response.error.context) {
            try {
              const body = await response.error.context.json();
              if (body?.error) msg = body.error;
            } catch {}
          }
          throw new Error(msg);
        }

        notify("success", "Socio registrado exitosamente.");
        form.reset();
        setPreviewUrl(null);
        setSelectedFile(null);
      } catch (err) {
        notify("error", err.message);
      }
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Notification */}
      {notification && (
        <View
          className={`flex-row items-center gap-2.5 p-3.5 rounded-xl mb-6 border ${
            notification.type === "success"
              ? "bg-brandSecondary-50 border-brandSecondary-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={16} color="#059669" />
          ) : (
            <X size={16} color="#dc2626" />
          )}
          <Text
            className={`flex-1 text-sm font-manrope-semi ${
              notification.type === "success"
                ? "text-brandSecondary-700"
                : "text-red-600"
            }`}
          >
            {notification.message}
          </Text>
          <Pressable
            onPress={() => setNotification(null)}
            style={{ cursor: "pointer" }}
          >
            <X size={14} color={notification.type === "success" ? "#059669" : "#dc2626"} />
          </Pressable>
        </View>
      )}

      {/* Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Pressable
            onPress={() => router.push("/admin/users")}
            className="flex-row items-center gap-1 hover:opacity-70"
            style={{ cursor: "pointer" }}
          >
            <ArrowLeft size={11} color={ui.text.muted} />
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted tracking-[1.4px] uppercase">
              Usuarios
            </Text>
          </Pressable>
          <Text className="text-[11px] text-ui-text-muted">·</Text>
          <Text className="text-[11px] font-manrope-semi text-brandPrimary-600 tracking-[1.4px] uppercase">
            Nuevo socio
          </Text>
        </View>
        <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
          Registrar socio
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted mt-1">
          Completá los datos para dar de alta un nuevo miembro
        </Text>
      </View>

      {/* Card */}
      <View
        className="bg-white rounded-[20px] border border-ui-input-border p-8 self-center w-full"
        style={{ maxWidth: 680 }}
      >
        {/* Photo picker */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <View className="items-center mb-8">
          <Pressable
            onPress={() => fileInputRef.current?.click()}
            className="items-center gap-3 hover:opacity-80"
            style={{ cursor: "pointer" }}
          >
            <View className="relative">
              {previewUrl ? (
                <Image
                  source={{ uri: previewUrl }}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View className="w-[88px] h-[88px] rounded-full bg-brandPrimary-50 items-center justify-center border-2 border-dashed border-brandPrimary-300">
                  <Polaroid size={30} color={brandPrimary[500]} />
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-brandPrimary-600 p-2 rounded-full border-2 border-white shadow-sm">
                <UserPlus size={13} color="white" />
              </View>
            </View>
            <View className="items-center">
              <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                Foto de perfil
              </Text>
              <Text className="text-[11px] font-manrope text-ui-text-muted">
                Hacé clic para elegir una imagen
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Divider */}
        <View className="w-full h-px bg-ui-input-light mb-7" />

        {/* Fields */}
        <View className="gap-y-5">
          {/* Row: Nombre + Apellido */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <form.Field
                name="name"
                validators={{ onChange: z.string().min(3, "Mínimo 3 caracteres") }}
              >
                {(field) => (
                  <Field label="NOMBRE(S)" error={field.state.meta.errors[0]?.message}>
                    <Input
                      placeholder="Ej: Juan Pablo"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                    />
                  </Field>
                )}
              </form.Field>
            </View>
            <View className="flex-1">
              <form.Field
                name="last_name"
                validators={{ onChange: z.string().min(2, "Mínimo 2 caracteres") }}
              >
                {(field) => (
                  <Field label="APELLIDO(S)" error={field.state.meta.errors[0]?.message}>
                    <Input
                      placeholder="Ej: Pérez García"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                    />
                  </Field>
                )}
              </form.Field>
            </View>
          </View>

          {/* Email */}
          <form.Field
            name="email"
            validators={{ onChange: z.string().email("Correo electrónico inválido") }}
          >
            {(field) => (
              <Field label="CORREO ELECTRÓNICO" error={field.state.meta.errors[0]?.message}>
                <Input
                  placeholder="juan.perez@ejemplo.com"
                  icon={<Mail size={15} color={ui.text.muted} />}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>
            )}
          </form.Field>

          {/* Row: Teléfono + Documento */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <form.Field
                name="phone"
                validators={{ onChange: z.string().min(8, "Mínimo 8 dígitos") }}
              >
                {(field) => (
                  <Field label="TELÉFONO" error={field.state.meta.errors[0]?.message}>
                    <Input
                      placeholder="123456789"
                      icon={<Phone size={15} color={ui.text.muted} />}
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      keyboardType="numeric"
                    />
                  </Field>
                )}
              </form.Field>
            </View>
            <View className="flex-1">
              <form.Field
                name="document_number"
                validators={{ onChange: z.string().min(5, "N° de documento inválido") }}
              >
                {(field) => (
                  <Field label="N° DE DOCUMENTO" error={field.state.meta.errors[0]?.message}>
                    <Input
                      placeholder="12345678"
                      icon={<IdBadge size={15} color={ui.text.muted} />}
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      keyboardType="numeric"
                    />
                  </Field>
                )}
              </form.Field>
            </View>
          </View>

          {/* Dirección */}
          <form.Field name="address">
            {(field) => (
              <Field label="DIRECCIÓN (OPCIONAL)">
                <Input
                  placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
                  icon={<MapPin size={15} color={ui.text.muted} />}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
              </Field>
            )}
          </form.Field>
        </View>

        {/* Submit */}
        <View className="mt-8">
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Pressable
                onPress={() => form.handleSubmit()}
                disabled={isSubmitting}
                className={`flex-row items-center justify-center gap-2 py-3 rounded-[13px] ${
                  isSubmitting
                    ? "bg-brandPrimary-400"
                    : "bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
                }`}
                style={{ cursor: isSubmitting ? "default" : "pointer" }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <UserPlus size={15} color="#fff" />
                )}
                <Text className="text-sm font-manrope-bold text-white">
                  {isSubmitting ? "Registrando..." : "Registrar Socio"}
                </Text>
              </Pressable>
            )}
          </form.Subscribe>
        </View>
      </View>
    </ScrollView>
  );
}
