import { saveMediaLocally } from "./saveMediaLocally";
import { uploadFileToCloudinary } from "./uploadFileToCloudinary";

export default async function HandlePickImage({
  onChange,
  pickMedia,
  source = "gallery",
}) {
  const result = await pickMedia({ source });
  if (result) {
    const { uri: permanentUri } = await saveMediaLocally(result.uri, "jpg");
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
