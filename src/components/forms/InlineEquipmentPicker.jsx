import { View, Pressable, ActivityIndicator } from "react-native";
import { useState, forwardRef } from "react";
import { Photo } from "../../../assets/icons";
import { ui } from "../../theme/colors";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../utils/uploadFileToCloudinary.js";
import { Image } from "expo-image";

const InlineEquipmentPicker = forwardRef(function InlineEquipmentPicker(
  { value, onChange, setImagePublicId, imagePublicId },
  ref
) {
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
        setImagePublicId(uploadedImage.public_id);
      } catch (error) {
        console.error(error.message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Pressable
      ref={ref}
      onPress={handlePickImage}
      className={`h-14 w-14 rounded-2xl border items-center justify-center overflow-hidden active:scale-95 transition-transform ${
        value || imagePublicId
          ? "border-brandSecondary-500 bg-ui-surface-light dark:bg-ui-surface-dark"
          : "border-dashed border-ui-innerBorder dark:border-ui-innerBorderDark bg-ui-surface-light dark:bg-ui-surface-dark"
      }`}
    >
      {value || imagePublicId ? (
        <>
          <Image
            source={{ uri: value }}
            className="absolute inset-0 w-full h-full"
            contentFit="cover"
            transition={300}
          />
          {isUploading && (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          )}
        </>
      ) : (
        <View className="items-center justify-center p-2 opacity-60">
          <Photo color={ui.text.main} size={20} />
        </View>
      )}
    </Pressable>
  );
});

export default InlineEquipmentPicker;
