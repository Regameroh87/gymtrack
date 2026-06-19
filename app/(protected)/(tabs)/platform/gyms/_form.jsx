// React Native
import { View, Text, TextInput, Pressable } from "react-native";

// Expo
import { Image } from "expo-image";

// BD / utils
import { CLOUD_NAME } from "../../../../../src/utils/cloudinary";

// Tema
import { ui, brandPrimary } from "../../../../../src/theme/colors";

// Iconos
import { Polaroid, CameraPlus } from "../../../../../assets/icons";

// Tokens de tamaño del logo del header → px. Debe coincidir con HEADER_LOGO_PX
// de app/(protected)/(tabs)/_layout.jsx para que el preview sea fiel.
export const HEADER_LOGO_PX = { sm: 30, md: 40, lg: 48 };

// Defaults del GymThemeProvider cuando el gym no define tema.
export const DEFAULT_PRIMARY = "#4A44E4";
export const DEFAULT_ACCENT = "#2DD4BF";

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Sube una imagen a Cloudinary (preset de imágenes pendientes de aprobación) y
// devuelve su public_id.
export const uploadImageWeb = async (file) => {
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

// Sube un video a Cloudinary (mismo preset/tag que el push del sync mobile) y
// devuelve su public_id. En web no hay sync, así que se sube en el guardado del form.
export const uploadVideoWeb = async (file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "gymtrack_videos");
  data.append("tags", "pending_approval");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: "POST", body: data }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Error al subir video");
  return json.public_id;
};

// "Energym Río Cuarto" -> "energym-rio-cuarto"
export const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function Field({ label, error, hint, children }) {
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

export function Input({ icon, ...props }) {
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
export function ColorField({ label, value, onChange, error }) {
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

export function SectionTitle({ step, title, subtitle }) {
  return (
    <View className="flex-row items-center gap-3 mb-5">
      <View className="w-[26px] h-[26px] rounded-lg bg-brandPrimary-600 items-center justify-center">
        <Text className="text-[12px] font-jakarta-bold text-white">{step}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-jakarta-bold text-ui-text-main tracking-tight">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[11px] font-manrope text-ui-text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Control segmentado: opciones = [{ value, label }]. Para tamaño y posición.
export function Segmented({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <View className="flex-row gap-1.5 bg-ui-background-light rounded-xl p-1 border border-ui-input-border">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 items-center py-2 rounded-lg ${
                active ? "bg-brandPrimary-600" : "hover:bg-white"
              }`}
              style={{ cursor: "pointer" }}
            >
              <Text
                className={`text-[12px] font-manrope-bold ${
                  active ? "text-white" : "text-ui-text-muted"
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

// Switch on/off con label y descripción a la izquierda.
export function Toggle({ label, hint, value, onChange }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="flex-row items-center justify-between gap-3 bg-white rounded-xl px-3.5 py-3 border border-ui-input-border hover:bg-ui-background-light"
      style={{ cursor: "pointer" }}
    >
      <View className="flex-1">
        <Text className="text-[13px] font-manrope-bold text-ui-text-main">
          {label}
        </Text>
        {hint ? (
          <Text className="text-[11px] font-manrope text-ui-text-muted mt-0.5">
            {hint}
          </Text>
        ) : null}
      </View>
      <View
        className={`w-[42px] h-[24px] rounded-full justify-center px-[3px] ${
          value ? "bg-brandPrimary-600" : "bg-ui-input-border"
        }`}
      >
        <View
          className="w-[18px] h-[18px] rounded-full bg-white"
          style={{ alignSelf: value ? "flex-end" : "flex-start" }}
        />
      </View>
    </Pressable>
  );
}

// Una barra de header (claro u oscuro). Replica las reglas del wordmark:
// logo contain → nombre → "GYMTRACK".
function PreviewBar({
  label,
  dark,
  logoUri,
  name,
  px,
  logoWidth,
  centered,
  content,
}) {
  const textColor = dark ? ui.text.mainDark : ui.text.main;
  const titleText = (
    <Text
      className="font-jakarta-bold"
      style={{ fontSize: px * 0.5, color: textColor, maxWidth: "100%" }}
      numberOfLines={1}
    >
      {name || "GYMTRACK"}
    </Text>
  );

  // Mismas reglas que GymLogo wordmark: title → nombre; sin logo → nombre;
  // logo → imagen; logo_title → imagen + nombre.
  let logoNode;
  if (content === "title" || !logoUri) {
    logoNode = titleText;
  } else {
    // Mismas reglas que GymLogo: en "logo_title" la caja es cuadrada (ancho =
    // alto) con el logo centrado, prolijo junto al nombre; en "logo" solo, caja
    // ancha y contentPosition según la alineación.
    const isLogoTitle = content === "logo_title";
    const boxWidth = isLogoTitle ? px : logoWidth;
    const contentPosition = isLogoTitle
      ? "center"
      : centered
        ? "center"
        : "left";
    const image = (
      <Image
        source={{ uri: logoUri }}
        style={{ height: px, width: boxWidth }}
        contentFit="contain"
        contentPosition={contentPosition}
      />
    );
    logoNode =
      content === "logo_title" ? (
        <View
          className="flex-row items-center"
          style={{ gap: 10, maxWidth: "100%" }}
        >
          {image}
          {name ? (
            <Text
              className="font-jakarta-bold capitalize"
              style={{ fontSize: px * 0.45, color: textColor, flexShrink: 1 }}
              numberOfLines={1}
            >
              {name}
            </Text>
          ) : null}
        </View>
      ) : (
        image
      );
  }

  return (
    <View className="gap-y-1" style={{ width: "100%", maxWidth: 380 }}>
      <Text className="text-[9px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        {label}
      </Text>
      <View
        className="rounded-2xl border border-ui-input-border overflow-hidden"
        style={{
          backgroundColor: dark ? ui.background.dark : ui.background.light,
        }}
      >
        <View
          className="relative flex-row items-center px-4"
          style={{ height: 64 }}
        >
          {/* Centro: como headerTitleAlign:"center" del header real, el logo se
              centra sobre TODO el ancho (centro absoluto), no solo el espacio
              a la izquierda del toggle. Izquierda: en flujo, como headerLeft. */}
          {centered ? (
            // px-12 reserva lugar para el toggle (derecha) y simetría (izq), así
            // el contenido centrado recorta con elipsis y no se mete bajo el toggle.
            <View
              pointerEvents="none"
              className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center px-12"
            >
              {logoNode}
            </View>
          ) : (
            <View className="flex-1 items-start">{logoNode}</View>
          )}
          {/* Toggle de tema (headerRight) representado como mini-switch neutro:
              más prolijo que el texto y sin color de marca. La perilla va a la
              izquierda en claro y a la derecha en oscuro. */}
          <View
            className="ml-auto rounded-full justify-center"
            style={{
              width: 34,
              height: 20,
              paddingHorizontal: 2,
              backgroundColor: dark ? ui.toggle.offDark : ui.toggle.offLight,
            }}
          >
            <View
              className="rounded-full"
              style={{
                width: 16,
                height: 16,
                alignSelf: dark ? "flex-end" : "flex-start",
                backgroundColor: dark ? ui.text.mutedDark : "#ffffff",
              }}
            />
          </View>
        </View>
        {/* Cuerpo simulado */}
        <View className="px-4 py-3 gap-y-2">
          <View
            className="w-1/3 h-2 rounded-full"
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.14)"
                : ui.input.border,
            }}
          />
          <View
            className="w-2/3 h-2 rounded-full"
            style={{
              backgroundColor: dark ? "rgba(255,255,255,0.07)" : ui.input.light,
            }}
          />
        </View>
      </View>
    </View>
  );
}

// Maqueta del header del celular en claro y oscuro a la vez. Presentacional
// puro: recibe los valores del form (no usa useGymTheme/GymLogo, porque el gym
// editado puede no ser el activo). El logo oscuro cae al principal si no hay.
export function HeaderPreview({
  logoUri,
  logoUriDark,
  name,
  size = "md",
  position = "left",
  content = "logo",
}) {
  const px = HEADER_LOGO_PX[size] ?? HEADER_LOGO_PX.md;
  const logoWidth = Math.min(px * 4, 200);
  const centered = position === "center";
  const shared = { name, px, logoWidth, centered, content };

  return (
    <View className="gap-y-1.5">
      <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        VISTA PREVIA DEL HEADER
      </Text>
      {/* Barras apiladas a ancho de celular: así el preview recorta el título
          en el mismo punto que el header real (no antes, como pasaba al estar
          lado a lado a media pantalla). */}
      <View className="gap-y-3 items-start">
        <PreviewBar label="Claro" dark={false} logoUri={logoUri} {...shared} />
        <PreviewBar
          label="Oscuro"
          dark
          logoUri={logoUriDark || logoUri}
          {...shared}
        />
      </View>
    </View>
  );
}

// Par de pickers de logo: principal (modo claro) + oscuro (opcional, sobre fondo
// oscuro). Presentacional puro; la lógica de archivos/refs vive en cada pantalla.
// Compartido entre crear y editar gym para que la UI sea idéntica.
export function LogoPickers({ logoUri, logoUriDark, onPickLight, onPickDark }) {
  return (
    <View className="flex-row gap-8 justify-center">
      {/* Logo principal (light) */}
      <Pressable
        onPress={onPickLight}
        className="items-center gap-3 hover:opacity-80"
        style={{ cursor: "pointer" }}
      >
        <View className="relative">
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
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
        onPress={onPickDark}
        className="items-center gap-3 hover:opacity-80"
        style={{ cursor: "pointer" }}
      >
        <View className="relative">
          {logoUriDark ? (
            <View
              className="w-[88px] h-[88px] rounded-[22px] items-center justify-center overflow-hidden"
              style={{ backgroundColor: ui.background.dark }}
            >
              <Image
                source={{ uri: logoUriDark }}
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
  );
}

// Bloque "Header del home": preview en vivo + controles de tamaño / posición /
// contenido. Recibe la instancia de @tanstack/react-form y los uris del preview.
// Compartido entre crear y editar gym.
export function HeaderConfigFields({ form, logoUri, logoUriDark }) {
  return (
    <>
      <View className="w-full h-px bg-ui-input-light my-1" />
      <Text className="text-[12px] font-jakarta-bold text-ui-text-main tracking-tight">
        Header del home
      </Text>
      <Text className="text-[11px] font-manrope text-ui-text-muted -mt-3">
        Cómo se ve el logo en la barra superior de la app de los miembros.
      </Text>

      {/* Preview en vivo: se suscribe a nombre + color + los 3 campos */}
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
            logoUri={logoUri}
            logoUriDark={logoUriDark}
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
    </>
  );
}
