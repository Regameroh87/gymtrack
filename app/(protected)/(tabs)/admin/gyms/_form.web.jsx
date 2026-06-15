// React Native
import { View, Text, TextInput, Pressable } from "react-native";

// Expo
import { Image } from "expo-image";

// BD / utils
import { CLOUD_NAME } from "../../../../../src/utils/cloudinary";

// Tema
import { ui } from "../../../../../src/theme/colors";

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

// Maqueta del header del celular. Presentacional puro: recibe los valores del
// form (no usa useGymTheme/GymLogo, porque el gym editado puede no ser el
// activo). Replica las reglas del wordmark: logo contain → nombre → "GYMTRACK".
export function HeaderPreview({
  logoUri,
  name,
  primaryColor,
  size = "md",
  position = "left",
  showTitle = false,
}) {
  const px = HEADER_LOGO_PX[size] ?? HEADER_LOGO_PX.md;
  const logoWidth = Math.min(px * 4, 200);
  const centered = position === "center";

  const logoNode = logoUri ? (
    <View
      className="flex-row items-center"
      style={{ gap: 10 }}
    >
      <Image
        source={{ uri: logoUri }}
        style={{ height: px, width: logoWidth }}
        contentFit="contain"
        contentPosition="left"
      />
      {showTitle && name ? (
        <Text
          className="font-jakarta-bold text-ui-text-main capitalize"
          style={{ fontSize: px * 0.45 }}
          numberOfLines={1}
        >
          {name}
        </Text>
      ) : null}
    </View>
  ) : (
    <Text
      className="font-jakarta-bold text-ui-text-main"
      style={{ fontSize: px * 0.5 }}
      numberOfLines={1}
    >
      {name || "GYMTRACK"}
    </Text>
  );

  return (
    <View className="gap-y-1.5">
      <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        VISTA PREVIA DEL HEADER
      </Text>
      <View className="rounded-2xl border border-ui-input-border overflow-hidden bg-white">
        {/* Barra del header */}
        <View
          className="flex-row items-center justify-between px-4 border-b border-ui-input-light"
          style={{ height: 64 }}
        >
          <View className={`flex-1 ${centered ? "items-center" : "items-start"}`}>
            {logoNode}
          </View>
          {/* Punto que representa el toggle de tema (headerRight) */}
          <View
            className="w-7 h-7 rounded-lg items-center justify-center"
            style={{ backgroundColor: `${primaryColor}1A` }}
          >
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
          </View>
        </View>
        {/* Cuerpo simulado */}
        <View className="px-4 py-3 gap-y-2 bg-ui-background-light">
          <View className="w-1/3 h-2 rounded-full bg-ui-input-border" />
          <View className="w-2/3 h-2 rounded-full bg-ui-input-light" />
        </View>
      </View>
    </View>
  );
}
