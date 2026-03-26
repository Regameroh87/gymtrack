import { View, Text, TextInput, Pressable } from "react-native";
import { Image } from "expo-image";
import { forwardRef } from "react";
import { Photo, Link, Upload } from "../../../../assets/icons";
import { ui, brandSecondary } from "../../../theme/colors";
import { useColorScheme } from "nativewind";
import { useMediaPicker } from "../../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../../utils/uploadFileToCloudinary.js";

const ImagePickerCard = forwardRef(function ImagePickerCard(
  { value, onChange, onFocus, setImagePublicId, imagePublicId },
  ref
) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { pickMedia } = useMediaPicker();
  const handlePickImage = async () => {
    const result = await pickMedia();
    if (result) {
      onChange(result.uri);
      try {
        const uploadedImage = await uploadFileToCloudinary({
          fileUri: result.uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        console.log("uploadedImage", uploadedImage);
        //onChange(uploadedImage.url);
        setImagePublicId(uploadedImage.public_id);
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <View
      ref={ref}
      className="rounded-2xl p-5 mb-4 border border-brandSecondary-600 border-l-4"
      style={{
        backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-5">
        <Photo
          color={isDark ? brandSecondary[300] : brandSecondary[500]}
          size={18}
        />
        <Text className="font-jakarta-bold ml-3 text-ui-text-main dark:text-slate-300 text-xs">
          Imagen de Referencia
        </Text>
      </View>

      {/* Preview */}
      <View className="items-center justify-center mb-4 bg-ui-surface-dimLight dark:bg-slate-950 h-44 rounded-xl overflow-hidden">
        {value ? (
          <Image
            source={{ uri: value }}
            style={{ width: "100%", height: "100%", borderRadius: 12 }}
          />
        ) : (
          <>
            <Photo color={isDark ? "#334155" : ui.text.muted} size={33} />
            <Text className="font-manrope-bold mt-2 text-ui-text-muted dark:text-slate-700 text-tiny">
              Sin Previsualización
            </Text>
          </>
        )}
      </View>

      {/* URL Input + Pick from gallery */}
      <View className="flex-col gap-4 mb-3">
        <View className="flex-row items-center rounded-xl bg-ui-surface-highLight dark:bg-ui-surface-highDark">
          <View className="pl-4">
            <Link color={ui.text.muted} size={15} />
          </View>
          <TextInput
            value={value}
            onChangeText={onChange}
            onFocus={onFocus}
            placeholder="Pegar URL de la imagen..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 px-3 font-manrope text-ui-text-main dark:text-ui-text-mainDark text-xs"
          />
        </View>

        <Pressable
          className="active:scale-[0.97] bg-brandSecondary-500 dark:bg-brandSecondary-700 rounded-xl py-3 px-6 flex-row items-center justify-center gap-2"
          onPress={handlePickImage}
        >
          <Upload color={isDark ? brandSecondary[300] : "#ffffff"} size={15} />
          <Text className="font-manrope-semi text-white dark:text-brandSecondary-300 text-xs">
            Subir imagen desde galería
          </Text>
        </Pressable>
      </View>

      <Text className="font-manrope mt-3 text-center text-ui-text-muted text-tiny">
        Referencia visual clara para asegurar la técnica correcta.
      </Text>
    </View>
  );
});

export default ImagePickerCard;
