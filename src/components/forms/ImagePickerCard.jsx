import { View, Text } from "react-native";
import { useState } from "react";
import { forwardRef } from "react";
import { Photo, Upload, Link } from "../../../assets/icons";
import { brandSecondary } from "../../theme/colors";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../utils/uploadFileToCloudinary.js";
import ButtonUploadAnimated from "../buttons/ButtonUploadAnimated";
import { useTheme } from "../../theme/theme";
import * as Haptics from "expo-haptics";
import HeaderCard from "../cards/HeaderCard";
import PreviewImage from "../images/PreviewImage";
import StyledInputCard from "../cards/StyledInputCard";
import { ui } from "../../theme/colors";

const ImagePickerCard = forwardRef(function ImagePickerCard(
  { value, onChange, onFocus, setImagePublicId, imagePublicId },
  ref
) {
  const { isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const { pickMedia } = useMediaPicker();

  const handleSelection = async (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result =
      type === "camera"
        ? await pickMedia({ source: "camera" })
        : await pickMedia({ source: "gallery" });
    if (result) {
      onChange(result.uri);
      setIsUploading(true);
      try {
        const uploadedImage = await uploadFileToCloudinary({
          fileUri: result.uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
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
      className="rounded-2xl p-5 mb-4 border bg-ui-surface-light dark:bg-ui-surface-dark border-brandSecondary-600 border-l-4"
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
      <View className=" h-44">
        <PreviewImage value={value}>
          <Photo color={isDark ? "#334155" : ui.text.muted} size={33} />
          <Text className="font-manrope-bold mt-2 text-ui-text-muted dark:text-slate-700 text-tiny">
            Sin Previsualización
          </Text>
        </PreviewImage>
      </View>

      {/* URL Input + Pick from gallery */}
      <View className=" gap-y-4 mt-4">
        <StyledInputCard
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder="Pegar URL de imagen..."
          icon={<Link color={ui.text.muted} size={16} />}
        />

        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <ButtonUploadAnimated
              isUploading={isUploading}
              labelLoading="Subiendo..."
              label="Galería"
              onPress={() => handleSelection("gallery")}
              backgroundColor="bg-brandSecondary-600/10 dark:bg-brandSecondary-600/10 border border-brandSecondary-500/20"
              textColor="text-brandSecondary-700 dark:text-brandSecondary-300"
              backgroundColorAnimated="bg-brandSecondary-300/20"
              textColorAnimated="text-brandSecondary-600 dark:text-brandSecondary-300"
              height="h-14"
            >
              <Upload color={isDark ? "#62fae3" : "#059669"} size={16} />
            </ButtonUploadAnimated>
          </View>

          <View className="flex-1">
            <ButtonUploadAnimated
              isUploading={isUploading}
              labelLoading="..."
              label="Cámara"
              onPress={() => handleSelection("camera")}
              backgroundColor="bg-brandPrimary-600/10 dark:bg-brandPrimary-600/10 border border-brandPrimary-500/20"
              textColor="text-brandPrimary-700 dark:text-brandPrimary-300"
              backgroundColorAnimated="bg-brandPrimary-300/20"
              textColorAnimated="text-brandPrimary-600 dark:text-brandPrimary-200"
              height="h-14"
            >
              <Photo color={isDark ? "#a5b4fc" : "#3023cd"} size={16} />
            </ButtonUploadAnimated>
          </View>
        </View>
      </View>
      <Text className="font-manrope mt-3 text-center text-ui-text-muted text-tiny">
        Referencia visual clara para asegurar la técnica correcta.
      </Text>
    </View>
  );
});

export default ImagePickerCard;
