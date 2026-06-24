// Helpers de UI compartidos por las secciones del catálogo web (ejercicios, sesiones,
// planes). Complementan los de gyms/_form.jsx (Field, Input, Toggle, Segmented...).
import { View, Text, Pressable, ActivityIndicator, Modal } from "react-native";
import { Image } from "expo-image";

import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { Plus, Trash, X, CheckCircle } from "../../../../../assets/icons";

// Select nativo del navegador, estilado para encajar con los Input del panel.
export function WebSelect({ value, onChange, options, placeholder }) {
  return (
    <View className="bg-white rounded-xl border border-ui-input-border px-1">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 8px",
          border: "none",
          background: "transparent",
          fontFamily: "Manrope",
          fontSize: 13,
          color: ui.text.main,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </View>
  );
}

// Picker de imagen de portada cuadrada. previewUrl es la URL local (objeto File);
// imageUri es el public_id ya guardado. onPick abre el file dialog del padre.
export function CoverPicker({
  previewUrl,
  imageUri,
  onPick,
  brandPrimary,
  label,
}) {
  const src = previewUrl
    ? previewUrl
    : imageUri
      ? getCloudinaryUrl(imageUri, "w_240,h_240,c_fill,f_auto,q_auto") ||
        imageUri
      : null;
  return (
    <View className="items-center">
      <Pressable onPress={onPick} style={{ cursor: "pointer" }}>
        {src ? (
          <Image
            source={{ uri: src }}
            style={{ width: 112, height: 112, borderRadius: 20 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-28 h-28 rounded-[20px] bg-brandPrimary-50 items-center justify-center border-2 border-dashed border-brandPrimary-300">
            <Plus size={24} color={brandPrimary[600]} />
          </View>
        )}
      </Pressable>
      <Text className="text-[11px] font-manrope text-ui-text-muted mt-2">
        {label ?? "Portada (opcional)"}
      </Text>
    </View>
  );
}

// Banner de error inline para los modales/forms del catálogo.
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View className="flex-row items-center gap-2 p-3 rounded-xl mb-4 bg-red-50 border border-red-200">
      <X size={14} color="#dc2626" />
      <Text className="flex-1 text-xs font-manrope-semi text-red-600">
        {message}
      </Text>
    </View>
  );
}

// Par de botones Cancelar / Guardar para el pie de un modal.
export function FormActions({ onCancel, onSubmit, isPending, submitLabel }) {
  return (
    <View className="flex-row gap-3 mt-6">
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
        style={{ cursor: "pointer" }}
      >
        <Text className="text-[13px] font-manrope-semi text-ui-text-main">
          Cancelar
        </Text>
      </Pressable>
      <Pressable
        onPress={onSubmit}
        disabled={isPending}
        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] ${
          isPending
            ? "bg-brandPrimary-400"
            : "bg-brandPrimary-600 hover:bg-brandPrimary-700"
        }`}
        style={{ cursor: isPending ? "default" : "pointer" }}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <CheckCircle size={15} color="#fff" />
        )}
        <Text className="text-[13px] font-manrope-bold text-white">
          {isPending ? "Guardando..." : (submitLabel ?? "Guardar")}
        </Text>
      </Pressable>
    </View>
  );
}

// Modal de confirmación de borrado reutilizable. `error` (opcional) muestra un banner
// rojo y mantiene el modal abierto cuando el borrado falla (ej. FK protectora).
export function DeleteConfirmModal({
  visible,
  title,
  message,
  error,
  isPending,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <View
          className="bg-white rounded-[20px] border border-ui-input-border p-7 w-full"
          style={{ maxWidth: 420 }}
        >
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
              <Trash size={18} color="#dc2626" />
            </View>
            <Text className="text-[16px] font-jakarta-bold text-ui-text-main tracking-tight">
              {title}
            </Text>
          </View>
          <Text className="text-[12px] font-manrope text-ui-text-muted leading-5 mb-5">
            {message}
          </Text>
          <ErrorBanner message={error} />
          <View className="flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
              style={{ cursor: "pointer" }}
            >
              <Text className="text-[13px] font-manrope-semi text-ui-text-main">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isPending}
              className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] ${
                isPending ? "bg-red-300" : "bg-red-600 hover:bg-red-700"
              }`}
              style={{ cursor: isPending ? "default" : "pointer" }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Trash size={14} color="#fff" />
              )}
              <Text className="text-[13px] font-manrope-bold text-white">
                Eliminar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
