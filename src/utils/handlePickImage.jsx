import { useMediaPicker } from "../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "./uploadFileToCloudinary";
export default async function HandlePickImage({ onChange }) {
  const { pickMedia } = useMediaPicker();
  const result = await pickMedia();
  if (result) {
    onChange(result.uri);
    //setIsUploading(true);
    try {
      const uploadedImage = await uploadFileToCloudinary({
        fileUri: result.uri,
        uploadPreset: "gymtrack_images",
        typeFile: "image",
      });
      console.log("uploadedImage", uploadedImage);
      //setImagePublicId(uploadedImage.public_id);
    } catch (error) {
      console.error(error.message);
    } finally {
      //setIsUploading(false);
    }
  }
}
