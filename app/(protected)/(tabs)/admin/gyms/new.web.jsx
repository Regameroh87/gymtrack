import { useMemo, useRef, useState } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "../../../../../src/database/supabase";
import { CLOUD_NAME } from "../../../../../src/utils/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { ROLES, ROLE_LABELS } from "../../../../../src/constants/roles";
import {
  Polaroid,
  Mail,
  Phone,
  MapPin,
  Link,
  ArrowLeft,
  CheckCircle,
  CameraPlus,
  Search,
  ShieldHalf,
  X,
} from "../../../../../assets/icons";

// Mismos defaults que GymThemeProvider cuando el gym no define tema.
const DEFAULT_PRIMARY = "#4A44E4";
const DEFAULT_ACCENT = "#2DD4BF";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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

// "Energym Río Cuarto" -> "energym-rio-cuarto"
const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function Field({ label, error, hint, children }) {
  return (
    <View className="gap-y-1.5">
      <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        {label}
      </Text>
      {children}
      {error ? (
        <Text className="text-red-500 text-[11px] font-manrope">{error}</Text>
      ) : hint ? (
        <Text className="text-[11px] font-manrope text-ui-text-muted">
          {hint}
        </Text>
      ) : null}
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

// Selector de color: swatch nativo del navegador + hex editable a mano.
function ColorField({ label, value, onChange, error }) {
  return (
    <Field label={label} error={error}>
      <View className="flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2 border border-ui-input-border">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 32,
            height: 32,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
          }}
        />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="#4A44E4"
          placeholderTextColor={ui.text.muted}
          autoCapitalize="none"
          className="flex-1 text-[13px] font-manrope text-ui-text-main"
          style={{ outlineWidth: 0 }}
        />
      </View>
    </Field>
  );
}

export default function NewGymWeb() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { brandPrimary } = useGymTheme();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);

  // Selector de dueño
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const { data: profiles } = useQuery({
    queryKey: ["admin_gyms_owner_candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, last_name, email, role, gym_id")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const ownerOptions = useMemo(() => {
    if (!profiles) return [];
    const q = ownerSearch.trim().toLowerCase();
    const rows = !q
      ? profiles
      : profiles.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.last_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)
        );
    return rows.slice(0, 6);
  }, [profiles, ownerSearch]);

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      theme_primary: DEFAULT_PRIMARY,
      theme_accent: DEFAULT_ACCENT,
      address: "",
      phone: "",
      email: "",
      instagram: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!selectedOwner) {
          notify("error", "Seleccioná el dueño del gimnasio.");
          return;
        }

        let logo_url = null;
        if (selectedFile) {
          try {
            logo_url = await uploadImageWeb(selectedFile);
          } catch {
            logo_url = null;
          }
        }

        const { data: gym, error } = await supabase
          .from("gyms")
          .insert({
            name: value.name.trim(),
            slug: value.slug.trim(),
            owner_id: selectedOwner.user_id,
            logo_url,
            theme_primary: value.theme_primary,
            theme_accent: value.theme_accent,
            address: value.address.trim() || null,
            phone: value.phone.trim() || null,
            email: value.email.trim() || null,
            instagram: value.instagram.trim() || null,
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") {
            throw new Error("Ya existe un gimnasio con ese slug.");
          }
          throw new Error(error.message);
        }

        // Vincula al dueño con su nuevo gym. Si el elegido es el propio
        // super_admin no se toca su perfil (sigue siendo cross-gym).
        if (selectedOwner.role !== ROLES.SUPER_ADMIN) {
          const { error: ownerError } = await supabase
            .from("profiles")
            .update({ role: ROLES.OWNER, gym_id: gym.id })
            .eq("user_id", selectedOwner.user_id);
          if (ownerError) {
            notify(
              "error",
              "Gimnasio creado, pero no se pudo asignar el perfil del dueño. Asignalo manualmente desde Usuarios."
            );
            return;
          }
        }

        queryClient.invalidateQueries({ queryKey: ["admin_gyms_web"] });
        queryClient.invalidateQueries({ queryKey: ["gyms"] });

        notify("success", "Gimnasio creado exitosamente.");
        form.reset();
        setPreviewUrl(null);
        setSelectedFile(null);
        setSelectedOwner(null);
        setOwnerSearch("");
        setSlugTouched(false);
        router.push("/admin/gyms");
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
            <X
              size={14}
              color={notification.type === "success" ? "#059669" : "#dc2626"}
            />
          </Pressable>
        </View>
      )}

      {/* Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Pressable
            onPress={() => router.push("/admin/gyms")}
            className="flex-row items-center gap-1 hover:opacity-70"
            style={{ cursor: "pointer" }}
          >
            <ArrowLeft size={11} color={ui.text.muted} />
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted tracking-[1.4px] uppercase">
              Gimnasios
            </Text>
          </Pressable>
          <Text className="text-[11px] text-ui-text-muted">·</Text>
          <Text className="text-[11px] font-manrope-semi text-brandPrimary-600 tracking-[1.4px] uppercase">
            Nuevo gimnasio
          </Text>
        </View>
        <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
          Crear gimnasio
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted mt-1">
          Alta de un nuevo gimnasio en la plataforma con su identidad y dueño
        </Text>
      </View>

      {/* Card */}
      <View
        className="bg-white rounded-[20px] border border-ui-input-border p-8 self-center w-full"
        style={{ maxWidth: 680 }}
      >
        {/* Logo picker */}
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
                  style={{ width: 88, height: 88, borderRadius: 22 }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View className="w-[88px] h-[88px] rounded-[22px] bg-brandPrimary-50 items-center justify-center border-2 border-dashed border-brandPrimary-300">
                  <Polaroid size={30} color={brandPrimary[500]} />
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-brandPrimary-600 p-2 rounded-full border-2 border-white shadow-sm">
                <CameraPlus size={13} color="white" />
              </View>
            </View>
            <View className="items-center">
              <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                Logo del gimnasio
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
          {/* Row: Nombre + Slug */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <form.Field
                name="name"
                validators={{
                  onChange: z.string().min(3, "Mínimo 3 caracteres"),
                }}
              >
                {(field) => (
                  <Field
                    label="NOMBRE"
                    error={field.state.meta.errors[0]?.message}
                  >
                    <Input
                      placeholder="Ej: Energym Centro"
                      value={field.state.value}
                      onChangeText={(t) => {
                        field.handleChange(t);
                        if (!slugTouched) {
                          form.setFieldValue("slug", slugify(t));
                        }
                      }}
                    />
                  </Field>
                )}
              </form.Field>
            </View>
            <View className="flex-1">
              <form.Field
                name="slug"
                validators={{
                  onChange: z
                    .string()
                    .min(3, "Mínimo 3 caracteres")
                    .regex(
                      /^[a-z0-9]+(-[a-z0-9]+)*$/,
                      "Solo minúsculas, números y guiones"
                    ),
                }}
              >
                {(field) => (
                  <Field
                    label="SLUG"
                    error={field.state.meta.errors[0]?.message}
                    hint="Identificador único en URLs y QR"
                  >
                    <Input
                      placeholder="energym-centro"
                      value={field.state.value}
                      autoCapitalize="none"
                      onChangeText={(t) => {
                        setSlugTouched(true);
                        field.handleChange(t);
                      }}
                    />
                  </Field>
                )}
              </form.Field>
            </View>
          </View>

          {/* Dueño */}
          <Field
            label="DUEÑO"
            hint={
              selectedOwner && selectedOwner.gym_id
                ? "Este usuario ya pertenece a un gym; al crear se lo reasigna como dueño del nuevo."
                : "Su perfil pasa a rol Dueño vinculado a este gimnasio."
            }
          >
            {selectedOwner ? (
              <View className="flex-row items-center gap-2.5 bg-brandPrimary-50 rounded-xl px-3.5 py-2.5 border border-brandPrimary-300">
                <ShieldHalf size={15} color={brandPrimary[600]} />
                <Text className="flex-1 text-[13px] font-manrope-semi text-ui-text-main">
                  {`${selectedOwner.name || ""} ${selectedOwner.last_name || ""}`.trim() ||
                    selectedOwner.email}
                  <Text className="font-manrope text-ui-text-muted">
                    {"  ·  "}
                    {selectedOwner.email} · {ROLE_LABELS[selectedOwner.role]}
                  </Text>
                </Text>
                <Pressable
                  onPress={() => setSelectedOwner(null)}
                  style={{ cursor: "pointer" }}
                >
                  <X size={14} color={ui.text.muted} />
                </Pressable>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
                  <Search size={15} color={ui.text.muted} />
                  <TextInput
                    value={ownerSearch}
                    onChangeText={setOwnerSearch}
                    onFocus={() => setOwnerOpen(true)}
                    placeholder="Buscar usuario por nombre o email..."
                    placeholderTextColor={ui.text.muted}
                    className="flex-1 text-[13px] font-manrope text-ui-text-main"
                    style={{ outlineWidth: 0 }}
                  />
                </View>

                {ownerOpen && ownerOptions.length > 0 && (
                  <View className="mt-1.5 bg-white rounded-xl border border-ui-input-border overflow-hidden">
                    {ownerOptions.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          setSelectedOwner(p);
                          setOwnerOpen(false);
                        }}
                        className="flex-row items-center gap-2.5 px-3.5 py-2.5 hover:bg-brandPrimary-50/60 border-b border-ui-input-light"
                        style={{ cursor: "pointer" }}
                      >
                        <View className="flex-1">
                          <Text className="text-[13px] font-manrope-semi text-ui-text-main">
                            {`${p.name || ""} ${p.last_name || ""}`.trim() ||
                              p.email}
                          </Text>
                          <Text className="text-[11px] font-manrope text-ui-text-muted">
                            {p.email}
                          </Text>
                        </View>
                        <View className="px-2 py-0.5 rounded-md bg-ui-background-light">
                          <Text className="text-[10px] font-manrope-semi text-ui-text-muted">
                            {ROLE_LABELS[p.role] || p.role}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Field>

          {/* Row: Colores del tema */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <form.Field
                name="theme_primary"
                validators={{
                  onChange: z.string().regex(HEX_RE, "Hex inválido (#RRGGBB)"),
                }}
              >
                {(field) => (
                  <ColorField
                    label="COLOR PRIMARIO"
                    value={field.state.value}
                    onChange={field.handleChange}
                    error={field.state.meta.errors[0]?.message}
                  />
                )}
              </form.Field>
            </View>
            <View className="flex-1">
              <form.Field
                name="theme_accent"
                validators={{
                  onChange: z.string().regex(HEX_RE, "Hex inválido (#RRGGBB)"),
                }}
              >
                {(field) => (
                  <ColorField
                    label="COLOR DE ACENTO"
                    value={field.state.value}
                    onChange={field.handleChange}
                    error={field.state.meta.errors[0]?.message}
                  />
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

          {/* Row: Teléfono + Email */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <form.Field name="phone">
                {(field) => (
                  <Field label="TELÉFONO (OPCIONAL)">
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
                name="email"
                validators={{
                  onChange: z
                    .string()
                    .email("Correo electrónico inválido")
                    .or(z.literal("")),
                }}
              >
                {(field) => (
                  <Field
                    label="EMAIL (OPCIONAL)"
                    error={field.state.meta.errors[0]?.message}
                  >
                    <Input
                      placeholder="contacto@energym.com"
                      icon={<Mail size={15} color={ui.text.muted} />}
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </Field>
                )}
              </form.Field>
            </View>
          </View>

          {/* Instagram */}
          <form.Field name="instagram">
            {(field) => (
              <Field label="INSTAGRAM (OPCIONAL)">
                <Input
                  placeholder="@energym"
                  icon={<Link size={15} color={ui.text.muted} />}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  autoCapitalize="none"
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
                  <ShieldHalf size={15} color="#fff" />
                )}
                <Text className="text-sm font-manrope-bold text-white">
                  {isSubmitting ? "Creando..." : "Crear Gimnasio"}
                </Text>
              </Pressable>
            )}
          </form.Subscribe>
        </View>
      </View>
    </ScrollView>
  );
}
