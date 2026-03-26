import { View, Text } from "react-native";
import { useState } from "react";
import { Image } from "expo-image";
import { forwardRef } from "react";
import { Photo, Upload } from "../../../../assets/icons";
import { ui, brandSecondary } from "../../../theme/colors";
import { useMediaPicker } from "../../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../../utils/uploadFileToCloudinary.js";
import ButtonUploadAnimated from "../../buttons/ButtonUploadAnimated";
import { useTheme } from "../../../utils/theme";
import HeaderCard from "../../../components/cards/HeaderCard";

const ImagePickerCard = forwardRef(function ImagePickerCard(
  { value, onChange, onFocus, setImagePublicId, imagePublicId },
  ref
) {
  const { isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const { pickMedia } = useMediaPicker();
  const handlePickImage = async () => {
    const result = await pickMedia();
    if (result) {
      onChange(result.uri);
      setIsUploading(true);
      try {
        const uploadedImage = await uploadFileToCloudinary({
          fileUri: result.uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        console.log("uploadedImage", uploadedImage);
        setImagePublicId(uploadedImage.public_id);
      } catch (error) {
        console.error(error.message);
      } finally {
        setIsUploading(false);
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
      <HeaderCard
        icon={
          <Photo
            color={isDark ? brandSecondary[300] : brandSecondary[500]}
            size={18}
          />
        }
        title="Imagen de Referencia"
      />

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
      <ButtonUploadAnimated
        isUploading={isUploading}
        labelLoading="Subiendo..."
        label="Subir imagen desde galería"
        onPress={handlePickImage}
      >
        <Upload color={isDark ? brandSecondary[300] : "#ffffff"} size={15} />
      </ButtonUploadAnimated>

      <Text className="font-manrope mt-3 text-center text-ui-text-muted text-tiny">
        Referencia visual clara para asegurar la técnica correcta.
      </Text>
    </View>
  );
});

export default ImagePickerCard;
