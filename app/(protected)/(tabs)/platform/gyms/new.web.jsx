import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { supabase } from "../../../../../src/database/supabase";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import {
  Field,
  Input,
  ColorField,
  SectionTitle,
  LogoPickers,
  HeaderConfigFields,
  slugify,
  uploadImageWeb,
  HEX_RE,
  DEFAULT_PRIMARY,
  DEFAULT_ACCENT,
} from "./_form";
import {
  Mail,
  Phone,
  MapPin,
  Link,
  ArrowLeft,
  CheckCircle,
  Search,
  ShieldHalf,
  X,
} from "../../../../../assets/icons";

const OWNER_MODES = [
  { value: "existing", label: "Usuario existente" },
  { value: "new", label: "Crear nuevo" },
];

export default function NewGymWeb() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { brandPrimary } = useGymTheme();
  const fileInputRef = useRef(null);
  const fileInputDarkRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrlDark, setPreviewUrlDark] = useState(null);
  const [selectedFileDark, setSelectedFileDark] = useState(null);
  const [notification, setNotification] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);

  // Selector de dueño
  const [ownerMode, setOwnerMode] = useState("existing");
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
        .select("id, user_id, name, last_name, email")
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
      header_logo_size: "md",
      header_logo_position: "left",
      header_content: "logo",
      address: "",
      phone: "",
      email: "",
      instagram: "",
      owner_name: "",
      owner_last_name: "",
      owner_email: "",
      owner_phone: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (ownerMode === "existing" && !selectedOwner) {
          notify("error", "Seleccioná el dueño del gimnasio.");
          return;
        }
        if (
          ownerMode === "new" &&
          (!value.owner_name.trim() || !value.owner_email.trim())
        ) {
          notify("error", "Completá nombre y email del nuevo dueño.");
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

        let logo_url_dark = null;
        if (selectedFileDark) {
          try {
            logo_url_dark = await uploadImageWeb(selectedFileDark);
          } catch {
            logo_url_dark = null;
          }
        }

        // La edge function crea el gym con rollback en cascada. Si el email
        // del dueño ya tiene cuenta (multi-gym), reutiliza la cuenta y solo
        // agrega la membresía de owner del gym nuevo; si no, crea auth user
        // + profile. Vale para ambos modos (dueño nuevo o existente).
        const ownerEmail =
          ownerMode === "new"
            ? value.owner_email.trim()
            : selectedOwner.email;

        const response = await supabase.functions.invoke("crear-gym", {
          body: {
            gym_name: value.name.trim(),
            gym_slug: value.slug.trim(),
            logo_url,
            logo_url_dark,
            theme_primary: value.theme_primary,
            theme_accent: value.theme_accent,
            header_logo_size: value.header_logo_size,
            header_logo_position: value.header_logo_position,
            header_content: value.header_content,
            gym_address: value.address.trim() || null,
            gym_phone: value.phone.trim() || null,
            gym_email: value.email.trim() || null,
            gym_instagram: value.instagram.trim() || null,
            email: ownerEmail,
            name: value.owner_name.trim() || null,
            last_name: value.owner_last_name.trim() || null,
            phone: value.owner_phone.trim() || null,
          },
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

        queryClient.invalidateQueries({ queryKey: ["admin_gyms_web"] });
        queryClient.invalidateQueries({ queryKey: ["gyms"] });

        notify(
          "success",
          ownerMode === "new"
            ? "Gimnasio y cuenta del dueño creados exitosamente."
            : "Gimnasio creado exitosamente."
        );
        form.reset();
        setPreviewUrl(null);
        setSelectedFile(null);
        setPreviewUrlDark(null);
        setSelectedFileDark(null);
        setSelectedOwner(null);
        setOwnerSearch("");
        setSlugTouched(false);
        setOwnerMode("existing");
        router.push("/platform/gyms");
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

  const handleFileChangeDark = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileDark(file);
    setPreviewUrlDark(URL.createObjectURL(file));
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
            onPress={() => router.push("/platform/gyms")}
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
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept="image/*"
          ref={fileInputDarkRef}
          style={{ display: "none" }}
          onChange={handleFileChangeDark}
        />

        {/* ── Sección 1 · Datos del gimnasio ── */}
        <SectionTitle
          step="1"
          title="Datos del gimnasio"
          subtitle="Identidad y contacto del establecimiento"
        />
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

        {/* Divider */}
        <View className="w-full h-px bg-ui-input-light my-7" />

        {/* ── Sección 2 · Dueño ── */}
        <SectionTitle
          step="2"
          title="Dueño"
          subtitle="Quién administra este gimnasio"
        />
        <View className="gap-y-5">
          {/* Toggle: existente / nuevo */}
          <View className="flex-row bg-ui-background-light rounded-xl p-1 self-start">
            {OWNER_MODES.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => setOwnerMode(m.value)}
                className={`px-4 py-1.5 rounded-lg ${
                  ownerMode === m.value ? "bg-white shadow-sm" : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <Text
                  className={`text-[12px] ${
                    ownerMode === m.value
                      ? "font-manrope-bold text-brandPrimary-600"
                      : "font-manrope-semi text-ui-text-muted"
                  }`}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {ownerMode === "existing" ? (
            <Field
              label="DUEÑO"
              hint="Recibe la membresía de Dueño del gimnasio nuevo; si ya pertenece a otros gyms, conserva esas membresías."
            >
              {selectedOwner ? (
                <View className="flex-row items-center gap-2.5 bg-brandPrimary-50 rounded-xl px-3.5 py-2.5 border border-brandPrimary-300">
                  <ShieldHalf size={15} color={brandPrimary[600]} />
                  <Text className="flex-1 text-[13px] font-manrope-semi text-ui-text-main">
                    {`${selectedOwner.name || ""} ${selectedOwner.last_name || ""}`.trim() ||
                      selectedOwner.email}
                    <Text className="font-manrope text-ui-text-muted">
                      {"  ·  "}
                      {selectedOwner.email}
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
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Field>
          ) : (
            <View className="gap-y-5">
              {/* Row: Nombre + Apellido */}
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <form.Field name="owner_name">
                    {(field) => (
                      <Field label="NOMBRE">
                        <Input
                          placeholder="Ej: Juan"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                        />
                      </Field>
                    )}
                  </form.Field>
                </View>
                <View className="flex-1">
                  <form.Field name="owner_last_name">
                    {(field) => (
                      <Field label="APELLIDO (OPCIONAL)">
                        <Input
                          placeholder="Ej: Pérez"
                          value={field.state.value}
                          onChangeText={field.handleChange}
                        />
                      </Field>
                    )}
                  </form.Field>
                </View>
              </View>

              {/* Row: Email + Teléfono */}
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <form.Field
                    name="owner_email"
                    validators={{
                      onChange: z
                        .string()
                        .email("Correo electrónico inválido")
                        .or(z.literal("")),
                    }}
                  >
                    {(field) => (
                      <Field
                        label="EMAIL"
                        error={field.state.meta.errors[0]?.message}
                      >
                        <Input
                          placeholder="dueno@energym.com"
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
                <View className="flex-1">
                  <form.Field name="owner_phone">
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
              </View>

              <View className="flex-row items-center gap-2 bg-brandPrimary-50 rounded-xl px-3.5 py-2.5 border border-brandPrimary-200">
                <ShieldHalf size={14} color={brandPrimary[600]} />
                <Text className="flex-1 text-[11px] font-manrope text-ui-text-muted">
                  Se crea su cuenta con rol Dueño y contraseña temporal{" "}
                  <Text className="font-manrope-bold text-ui-text-main">
                    tugimnasio123
                  </Text>
                  . El email queda confirmado automáticamente.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Divider */}
        <View className="w-full h-px bg-ui-input-light my-7" />

        {/* ── Sección 3 · Theme ── */}
        <SectionTitle
          step="3"
          title="Theme"
          subtitle="Logo y colores que ven los miembros del gym"
        />
        <View className="gap-y-5">
          {/* Logo picker: claro (principal) + oscuro (opcional) */}
          <LogoPickers
            logoUri={previewUrl}
            logoUriDark={previewUrlDark}
            onPickLight={() => fileInputRef.current?.click()}
            onPickDark={() => fileInputDarkRef.current?.click()}
          />

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

          {/* ── Header del home: tamaño / posición / contenido + preview ── */}
          <HeaderConfigFields
            form={form}
            logoUri={previewUrl}
            logoUriDark={previewUrlDark}
          />
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
