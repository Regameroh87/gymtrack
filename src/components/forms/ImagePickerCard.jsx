import { View, Text } from "react-native";
import { useState } from "react";
import { forwardRef } from "react";
import { Photo, Upload, Link } from "../../../assets/icons";
import { brandSecondary } from "../../theme/colors";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../utils/uploadFileToCloudinary.js";
import ButtonUploadAnimated from "../buttons/ButtonUploadAnimated";
import { useTheme } from "../../utils/theme";
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
      <PreviewImage value={value} />

      {/* URL Input + Pick from gallery */}
      <View className=" gap-y-4">
        <StyledInputCard
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder="Pegar URL de imagen..."
          icon={<Link color={ui.text.muted} size={16} />}
        />

        <ButtonUploadAnimated
          isUploading={isUploading}
          labelLoading="Subiendo..."
          label="Subir imagen desde galería"
          onPress={handlePickImage}
        >
          <Upload color={isDark ? brandSecondary[300] : "#ffffff"} size={15} />
        </ButtonUploadAnimated>
      </View>
      <Text className="font-manrope mt-3 text-center text-ui-text-muted text-tiny">
        Referencia visual clara para asegurar la técnica correcta.
      </Text>
    </View>
  );
});

export default ImagePickerCard;
