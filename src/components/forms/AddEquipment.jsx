import React, { useState, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { CameraPlus, CloudUpload, Plus, Trash } from "../../../assets/icons";
import PreviewImage from "../../components/images/PreviewImage";
import { useTheme } from "../../theme/theme";
import { ui } from "../../theme/colors";
import HandlePickImage from "../../utils/handlePickImage";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import * as Haptics from "expo-haptics";
import StyledTextInput from "./StyledTextInput";
import { Barbell } from "../../../assets/icons";

export default function AddEquipment({ onAdd, onCancel, initialName = "" }) {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();

  const [name, setName] = useState(initialName);
  const [imageUri, setImageUri] = useState("");

  useEffect(() => {
    if (initialName) {
      setName(initialName);
    }
  }, [initialName]);

  return (
    <View className="gap-y-4 w-full p-4 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl mt-4 border border-ui-border-light dark:border-ui-border-dark shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark uppercase tracking-widest">
          NUEVA MÁQUINA / ACCESORIO
        </Text>
        {onCancel && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
          >
            <Text className="text-red-500 font-manrope-medium text-xs">
              Cancelar
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row justify-center items-center gap-4 mt-1">
        <View className="w-20 h-20 rounded-xl overflow-hidden bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark border border-ui-input-light dark:border-ui-input-dark">
          <PreviewImage value={imageUri}>
            <CameraPlus color={ui.text.mutedDark} size={20} />
          </PreviewImage>
        </View>
        <View className="flex-1">
          <StyledTextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Barra Z, Polea"
            icon={<Barbell color={ui.text.mutedDark} />}
          />
        </View>
      </View>

      <View className="flex-1 mt-2">
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              HandlePickImage({
                pickMedia,
                source: "gallery",
                onChange: (uri) => setImageUri(uri),
              });
            }}
            className="flex-1 flex-row border border-brandSecondary-500/20 justify-center items-center gap-2 bg-brandSecondary-600/10 rounded-xl p-3"
          >
            <CloudUpload color={isDark ? "#62fae3" : "#059669"} size={16} />
            <Text className="text-brandSecondary-600 dark:text-brandSecondary-400 font-manrope-semi text-xs">
              Galería
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              HandlePickImage({
                pickMedia,
                source: "camera",
                onChange: (uri) => setImageUri(uri),
              });
            }}
            className="flex-1 flex-row border border-brandPrimary-500/20 justify-center items-center gap-2 bg-brandPrimary-600/10 rounded-xl p-3"
          >
            <CameraPlus color={isDark ? "#a5b4fc" : "#3023cd"} size={16} />
            <Text className="text-brandPrimary-600 dark:text-brandPrimary-400 font-manrope-semi text-xs">
              Cámara
            </Text>
          </Pressable>
        </View>

        <Pressable
          disabled={!name.trim()}
          onPress={() => {
            if (!name.trim()) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (onAdd) {
              onAdd({
                name: name.trim(),
                image_public_id: imageUri,
                isNew: true,
              });
            }
            // Reset local context if they don't unmount it
            setName("");
            setImageUri("");
          }}
          className={`flex-row justify-center items-center gap-2 rounded-xl p-3.5 mt-3 ${
            name.trim()
              ? "bg-brandPrimary-600"
              : "bg-ui-input-light dark:bg-ui-input-dark bg-opacity-50"
          }`}
        >
          <Plus color={name.trim() ? "white" : ui.text.muted} size={16} />
          <Text
            className={`${name.trim() ? "text-white" : "text-ui-text-muted"} text-sm font-jakarta-bold`}
          >
            CONFIRMAR Y AGREGAR
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
