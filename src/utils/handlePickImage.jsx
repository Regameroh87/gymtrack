import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";

export default async function HandlePickImage({
  onChange,
  pickMedia,
  source = "gallery",
}) {
  const result = await pickMedia({ source });
  if (result) {
    try {
      const ext = result.uri.split(".").pop() || "jpg";
      const fileName = `${Crypto.randomUUID()}.${ext}`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({ from: result.uri, to: permanentUri });
      
      // Enviamos el permanentUri. El segundo parámetro (public_id) va vacío por ahora
      onChange(permanentUri, ""); 
    } catch (error) {
      console.error("Error saving local file: ", error.message);
    }
  }
}
