// React Native
import { View, Text, TextInput } from "react-native";

// BD / utils
import { CLOUD_NAME } from "../../../../../src/utils/cloudinary";

// Tema
import { ui } from "../../../../../src/theme/colors";

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
