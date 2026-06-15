// React / libs
import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// BD / hooks
import { supabase } from "../../../../../src/database/supabase";
import { useUpdateGym } from "../../../../../src/hooks/gyms/use-update-gym";
import { useDeleteGym } from "../../../../../src/hooks/gyms/use-delete-gym";
import { useToggleGymActive } from "../../../../../src/hooks/gyms/use-toggle-gym-active";

// Utils / tema
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";

// Helpers de formulario compartidos
import {
  Field,
  Input,
  ColorField,
  SectionTitle,
  Segmented,
  HeaderPreview,
  slugify,
  uploadImageWeb,
  HEX_RE,
  DEFAULT_PRIMARY,
  DEFAULT_ACCENT,
} from "./_form.web";

// Iconos
import {
  Polaroid,
  Mail,
  Phone,
  MapPin,
  Link,
  ArrowLeft,
  CheckCircle,
  CameraPlus,
  ShieldHalf,
  Lock,
  Trash,
  X,
} from "../../../../../assets/icons";

export default function EditGymWeb() {
  const { id } = useLocalSearchParams();
  const { brandPrimary } = useGymTheme();

  const {
    data: gym,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["gym", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      // El owner vive en profiles (FK por user_id hacia auth.users).
      let owner = null;
      if (data.owner_id) {
        const { data: ownerRow } = await supabase
          .from("profiles")
          .select("user_id, name, last_name, email")
          .eq("user_id", data.owner_id)
          .maybeSingle();
        owner = ownerRow ?? null;
      }
      return { ...data, owner };
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="small" color={brandPrimary[600]} />
        <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
          Cargando gimnasio...
        </Text>
      </View>
    );
  }

  if (isError || !gym) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-12 h-12 rounded-[14px] bg-red-50 items-center justify-center mb-3">
          <X size={20} color="#dc2626" />
        </View>
        <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
          No se pudo cargar el gimnasio
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted">
          Es posible que ya no exista.
        </Text>
      </View>
    );
  }

  // El form se monta recién con los datos cargados para poblar defaultValues.
  return <EditGymForm gym={gym} />;
}

function EditGymForm({ gym }) {
  const router = useRouter();
  const { brandPrimary } = useGymTheme();
  const fileInputRef = useRef(null);
  const fileInputDarkRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrlDark, setPreviewUrlDark] = useState(null);
  const [selectedFileDark, setSelectedFileDark] = useState(null);
  const [notification, setNotification] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);

  const updateGym = useUpdateGym(gym.id);
  const deleteGym = useDeleteGym();
  const toggleActive = useToggleGymActive(gym.id);

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const currentLogoUrl = useMemo(
    () => getCloudinaryUrl(gym.logo_url) || (gym.logo_url ? `${gym.logo_url}` : null),
    [gym.logo_url]
  );

  const currentLogoUrlDark = useMemo(
    () =>
      getCloudinaryUrl(gym.logo_url_dark) ||
      (gym.logo_url_dark ? `${gym.logo_url_dark}` : null),
    [gym.logo_url_dark]
  );

  const ownerLabel = gym.owner
    ? `${gym.owner.name || ""} ${gym.owner.last_name || ""}`.trim() ||
      gym.owner.email
    : "Sin dueño asignado";

  const form = useForm({
    defaultValues: {
      name: gym.name ?? "",
      slug: gym.slug ?? "",
      theme_primary: gym.theme_primary || DEFAULT_PRIMARY,
      theme_accent: gym.theme_accent || DEFAULT_ACCENT,
      address: gym.address ?? "",
      phone: gym.phone ?? "",
      email: gym.email ?? "",
      instagram: gym.instagram ?? "",
      header_logo_size: gym.header_logo_size ?? "md",
      header_logo_position: gym.header_logo_position ?? "left",
      header_content: gym.header_content ?? "logo",
    },
    onSubmit: async ({ value }) => {
      try {
        // Solo se sube un logo nuevo si el usuario eligió un archivo.
        let logoUrl = gym.logo_url ?? null;
        if (selectedFile) {
          try {
            logoUrl = await uploadImageWeb(selectedFile);
          } catch {
            logoUrl = gym.logo_url ?? null;
          }
        }

        // Logo dark (opcional): solo se sube si el usuario eligió uno nuevo.
        let logoUrlDark = gym.logo_url_dark ?? null;
        if (selectedFileDark) {
          try {
            logoUrlDark = await uploadImageWeb(selectedFileDark);
          } catch {
            logoUrlDark = gym.logo_url_dark ?? null;
          }
        }

        await updateGym.mutateAsync({
          name: value.name.trim(),
          slug: value.slug.trim(),
          logo_url: logoUrl,
          logo_url_dark: logoUrlDark,
          theme_primary: value.theme_primary,
          theme_accent: value.theme_accent,
          address: value.address.trim() || null,
          phone: value.phone.trim() || null,
          email: value.email.trim() || null,
          instagram: value.instagram.trim() || null,
          header_logo_size: value.header_logo_size,
          header_logo_position: value.header_logo_position,
          header_content: value.header_content,
        });

        notify("success", "Gimnasio actualizado correctamente.");
        router.push("/admin/gyms");
      } catch (err) {
        // Slug duplicado u otros errores de la BD.
        const msg =
          err?.code === "23505"
            ? "Ese slug ya está en uso por otro gimnasio."
            : err?.message || "No se pudo guardar el gimnasio.";
        notify("error", msg);
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

  const logoToShow = previewUrl || currentLogoUrl;
  const logoToShowDark = previewUrlDark || currentLogoUrlDark;
  const canConfirmDelete = confirmSlug.trim() === gym.slug;

  const handleDelete = async () => {
    try {
      await deleteGym.mutateAsync({ gymId: gym.id });
      // onSuccess del hook redirige a /admin/gyms.
    } catch (err) {
      setConfirmOpen(false);
      notify("error", err.message);
    }
  };

  // Suspender es reversible: reactivar va directo, suspender pide confirmación
  // (corta el acceso de todos los miembros, incluido el dueño).
  const handleToggleActive = async () => {
    const next = !gym.is_active;
    try {
      await toggleActive.mutateAsync(next);
      setSuspendOpen(false);
      notify(
        "success",
        next ? "Gimnasio reactivado." : "Gimnasio suspendido."
      );
    } catch (err) {
      setSuspendOpen(false);
      notify("error", err.message || "No se pudo actualizar el estado.");
    }
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
            Editar
          </Text>
        </View>
        <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
          {gym.name}
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted mt-1">
          Editá la identidad, contacto y tema del gimnasio
        </Text>
      </View>

      {/* Aviso de suspensión */}
      {!gym.is_active && (
        <View
          className="flex-row items-center gap-2.5 p-3.5 rounded-xl mb-6 border bg-amber-50 border-amber-200 self-center w-full"
          style={{ maxWidth: 680 }}
        >
          <Lock size={16} color="#b45309" />
          <Text className="flex-1 text-sm font-manrope-semi text-amber-700">
            Gimnasio suspendido. Sus miembros —incluido el dueño— no pueden
            acceder a la app hasta reactivarlo.
          </Text>
        </View>
      )}

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

        {/* ── Sección 2 · Dueño (solo lectura) ── */}
        <SectionTitle
          step="2"
          title="Dueño"
          subtitle="Quién administra este gimnasio"
        />
        <View className="flex-row items-center gap-2.5 bg-ui-background-light rounded-xl px-3.5 py-3 border border-ui-input-border">
          <ShieldHalf size={15} color={brandPrimary[600]} />
          <Text className="flex-1 text-[13px] font-manrope-semi text-ui-text-main">
            {ownerLabel}
            {gym.owner?.email ? (
              <Text className="font-manrope text-ui-text-muted">
                {"  ·  "}
                {gym.owner.email}
              </Text>
            ) : null}
          </Text>
        </View>
        <Text className="text-[11px] font-manrope text-ui-text-muted mt-1.5">
          El dueño no se modifica desde esta pantalla.
        </Text>

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
          <View className="flex-row gap-8 justify-center">
            {/* Logo principal (light) */}
            <Pressable
              onPress={() => fileInputRef.current?.click()}
              className="items-center gap-3 hover:opacity-80"
              style={{ cursor: "pointer" }}
            >
              <View className="relative">
                {logoToShow ? (
                  <Image
                    source={{ uri: logoToShow }}
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
                  Logo principal
                </Text>
                <Text className="text-[11px] font-manrope text-ui-text-muted">
                  Se usa en modo claro
                </Text>
              </View>
            </Pressable>

            {/* Logo oscuro (opcional). Thumbnail sobre fondo oscuro. */}
            <Pressable
              onPress={() => fileInputDarkRef.current?.click()}
              className="items-center gap-3 hover:opacity-80"
              style={{ cursor: "pointer" }}
            >
              <View className="relative">
                {logoToShowDark ? (
                  <View
                    className="w-[88px] h-[88px] rounded-[22px] items-center justify-center overflow-hidden"
                    style={{ backgroundColor: ui.background.dark }}
                  >
                    <Image
                      source={{ uri: logoToShowDark }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ) : (
                  <View
                    className="w-[88px] h-[88px] rounded-[22px] items-center justify-center border-2 border-dashed"
                    style={{
                      backgroundColor: ui.background.dark,
                      borderColor: "rgba(255,255,255,0.18)",
                    }}
                  >
                    <Polaroid size={30} color="rgba(255,255,255,0.55)" />
                  </View>
                )}
                <View className="absolute bottom-0 right-0 bg-brandPrimary-600 p-2 rounded-full border-2 border-white shadow-sm">
                  <CameraPlus size={13} color="white" />
                </View>
              </View>
              <View className="items-center">
                <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                  Logo modo oscuro
                </Text>
                <Text className="text-[11px] font-manrope text-ui-text-muted">
                  Opcional · cae al principal
                </Text>
              </View>
            </Pressable>
          </View>

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

          {/* ── Header del home: tamaño / posición / título + preview ── */}
          <View className="w-full h-px bg-ui-input-light my-1" />
          <Text className="text-[12px] font-jakarta-bold text-ui-text-main tracking-tight">
            Header del home
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted -mt-3">
            Cómo se ve el logo en la barra superior de la app de los miembros.
          </Text>

          {/* Preview en vivo: se suscribe a logo + nombre + color + los 3 campos */}
          <form.Subscribe
            selector={(s) => ({
              name: s.values.name,
              primary: s.values.theme_primary,
              size: s.values.header_logo_size,
              position: s.values.header_logo_position,
              content: s.values.header_content,
            })}
          >
            {({ name, primary, size, position, content }) => (
              <HeaderPreview
                logoUri={logoToShow}
                logoUriDark={logoToShowDark}
                name={name}
                primaryColor={HEX_RE.test(primary) ? primary : DEFAULT_PRIMARY}
                size={size}
                position={position}
                content={content}
              />
            )}
          </form.Subscribe>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <form.Field name="header_logo_size">
                {(field) => (
                  <Segmented
                    label="TAMAÑO DEL LOGO"
                    value={field.state.value}
                    onChange={field.handleChange}
                    options={[
                      { value: "sm", label: "Chico" },
                      { value: "md", label: "Medio" },
                      { value: "lg", label: "Grande" },
                    ]}
                  />
                )}
              </form.Field>
            </View>
            <View className="flex-1">
              <form.Field name="header_logo_position">
                {(field) => (
                  <Segmented
                    label="POSICIÓN"
                    value={field.state.value}
                    onChange={field.handleChange}
                    options={[
                      { value: "left", label: "Izquierda" },
                      { value: "center", label: "Centro" },
                    ]}
                  />
                )}
              </form.Field>
            </View>
          </View>

          <form.Field name="header_content">
            {(field) => (
              <Segmented
                label="CONTENIDO DEL HEADER"
                value={field.state.value}
                onChange={field.handleChange}
                options={[
                  { value: "logo", label: "Solo logo" },
                  { value: "logo_title", label: "Logo + nombre" },
                  { value: "title", label: "Solo nombre" },
                ]}
              />
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
                  <CheckCircle size={15} color="#fff" />
                )}
                <Text className="text-sm font-manrope-bold text-white">
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </Text>
              </Pressable>
            )}
          </form.Subscribe>
        </View>
      </View>

      {/* ── Suspensión (reversible) ── */}
      <View
        className="bg-amber-50/60 rounded-[20px] border border-amber-200 p-6 self-center w-full mt-6"
        style={{ maxWidth: 680 }}
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="text-[14px] font-jakarta-bold text-amber-700 tracking-tight">
              {gym.is_active ? "Suspender gimnasio" : "Reactivar gimnasio"}
            </Text>
            <Text className="text-[11px] font-manrope text-amber-700/80 mt-1">
              {gym.is_active
                ? "Corta el acceso de todos los miembros (incluido el dueño) sin borrar nada. Los datos se conservan y se restablecen al reactivar."
                : "Restablece el acceso de todos los miembros. Los datos siguen intactos."}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              // Reactivar es seguro: va directo. Suspender pide confirmación.
              if (gym.is_active) {
                setSuspendOpen(true);
              } else {
                handleToggleActive();
              }
            }}
            disabled={toggleActive.isPending}
            className={`flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] shadow-md ${
              gym.is_active
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                : "bg-brandSecondary-600 hover:bg-brandSecondary-700 shadow-brandSecondary-600/30"
            }`}
            style={{ cursor: toggleActive.isPending ? "default" : "pointer" }}
          >
            {toggleActive.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : gym.is_active ? (
              <Lock size={15} color="#fff" />
            ) : (
              <CheckCircle size={15} color="#fff" />
            )}
            <Text className="text-[13px] font-manrope-bold text-white">
              {gym.is_active ? "Suspender" : "Reactivar"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Danger zone ── */}
      <View
        className="bg-red-50/60 rounded-[20px] border border-red-200 p-6 self-center w-full mt-6"
        style={{ maxWidth: 680 }}
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="text-[14px] font-jakarta-bold text-red-700 tracking-tight">
              Eliminar gimnasio
            </Text>
            <Text className="text-[11px] font-manrope text-red-600/80 mt-1">
              Borra el gimnasio y todos sus datos (socios, planes, sesiones,
              asistencias e historial). Las cuentas que solo pertenezcan a este
              gym se eliminan. Esta acción no se puede deshacer.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setConfirmSlug("");
              setConfirmOpen(true);
            }}
            className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30"
            style={{ cursor: "pointer" }}
          >
            <Trash size={15} color="#fff" />
            <Text className="text-[13px] font-manrope-bold text-white">
              Eliminar
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Modal de confirmación */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <View
            className="bg-white rounded-[20px] border border-ui-input-border p-7 w-full"
            style={{ maxWidth: 460 }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                <Trash size={18} color="#dc2626" />
              </View>
              <Text className="text-[17px] font-jakarta-bold text-ui-text-main tracking-tight">
                Eliminar “{gym.name}”
              </Text>
            </View>

            <Text className="text-[12px] font-manrope text-ui-text-muted leading-5 mb-4">
              Vas a borrar de forma permanente el gimnasio y todos sus datos.
              Para confirmar, escribí su slug{" "}
              <Text className="font-manrope-bold text-ui-text-main">
                {gym.slug}
              </Text>
              .
            </Text>

            <TextInput
              value={confirmSlug}
              onChangeText={setConfirmSlug}
              placeholder={gym.slug}
              placeholderTextColor={ui.text.muted}
              autoCapitalize="none"
              className="text-[13px] font-manrope text-ui-text-main bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border mb-5"
              style={{ outlineWidth: 0 }}
            />

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setConfirmOpen(false)}
                disabled={deleteGym.isPending}
                className="flex-1 items-center py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
                style={{ cursor: "pointer" }}
              >
                <Text className="text-[13px] font-manrope-semi text-ui-text-main">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={!canConfirmDelete || deleteGym.isPending}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] ${
                  !canConfirmDelete || deleteGym.isPending
                    ? "bg-red-300"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                style={{
                  cursor:
                    !canConfirmDelete || deleteGym.isPending
                      ? "default"
                      : "pointer",
                }}
              >
                {deleteGym.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Trash size={14} color="#fff" />
                )}
                <Text className="text-[13px] font-manrope-bold text-white">
                  {deleteGym.isPending ? "Eliminando..." : "Eliminar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de suspensión */}
      <Modal
        visible={suspendOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSuspendOpen(false)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <View
            className="bg-white rounded-[20px] border border-ui-input-border p-7 w-full"
            style={{ maxWidth: 460 }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
                <Lock size={18} color="#b45309" />
              </View>
              <Text className="text-[17px] font-jakarta-bold text-ui-text-main tracking-tight">
                Suspender “{gym.name}”
              </Text>
            </View>

            <Text className="text-[12px] font-manrope text-ui-text-muted leading-5 mb-5">
              Todos los miembros del gimnasio —incluido el dueño— quedarán sin
              acceso a la app y se cerrará su sesión. No se borra ningún dato:
              podés reactivarlo cuando quieras y todo vuelve a estar disponible.
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setSuspendOpen(false)}
                disabled={toggleActive.isPending}
                className="flex-1 items-center py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
                style={{ cursor: "pointer" }}
              >
                <Text className="text-[13px] font-manrope-semi text-ui-text-main">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleToggleActive}
                disabled={toggleActive.isPending}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] ${
                  toggleActive.isPending
                    ? "bg-amber-300"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
                style={{
                  cursor: toggleActive.isPending ? "default" : "pointer",
                }}
              >
                {toggleActive.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Lock size={14} color="#fff" />
                )}
                <Text className="text-[13px] font-manrope-bold text-white">
                  {toggleActive.isPending ? "Suspendiendo..." : "Suspender"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
