import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import { uploadFileToCloudinary } from "./uploadFileToCloudinary";

export default async function HandlePickImage({
  onChange,
  pickMedia,
  source = "gallery",
}) {
  const result = await pickMedia({ source });
  if (result) {
    const ext = result.uri.split(".").pop() || "jpg";
    const fileName = `${Crypto.randomUUID()}.${ext}`;
    // eslint-disable-next-line import/namespace
    const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // eslint-disable-next-line import/namespace
    await FileSystem.copyAsync({ from: result.uri, to: permanentUri });
    onChange(permanentUri);
    //setIsUploading(true);
    try {
      const uploadedImage = await uploadFileToCloudinary({
        fileUri: permanentUri,
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
