import * as ImagePicker from "expo-image-picker";
import { Pressable, Text, Alert, Linking } from "react-native";
import { Upload } from "../../assets/icons";
import { ui } from "../theme/colors";
export default function InputUploadVideo({ value, onChange }) {
  const UPLOAD_PRESET = "gymtrack_videos";

  const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  const pickVideo = async () => {
    // 1. Si no tenemos permiso, lo pedimos
    if (!status?.granted) {
      const permission = await requestPermission();

      // 2. Si lo acaba de denegar:
      if (!permission.granted) {
        // ¿El sistema nos permite volver a preguntar en el futuro?
        if (permission.canAskAgain) {
          Alert.alert(
            "Permiso necesario",
            "Para subir un video de tus ejercicios, necesitamos acceso a tu galería."
          );
        } else {
          // Si ya no podemos preguntar (Denegación definitiva), le enviamos a Ajustes
          Alert.alert(
            "Permiso denegado",
            "Has desactivado el acceso a la galería. Para subir videos, por favor actívalo en los ajustes de tu teléfono.",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Ir a Ajustes", onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const videoFile = result.assets[0];
      console.log("enviando video a cloudinary");
      // 1. Preparar los datos para Cloudinary
      const extension = videoFile.uri.split(".").pop();
      const data = new FormData();
      data.append("file", {
        uri: videoFile.uri,
        type: `video/${extension}`,
        name: `video_${Date.now()}.${extension}`,
      });
      data.append("upload_preset", UPLOAD_PRESET);

      try {
        const response = await fetch(UPLOAD_URL, {
          method: "POST",
          body: data,
          headers: { "Content-Type": "multipart/form-data" },
        });
        const result = await response.json();
        if (result.secure_url) {
          // Guardamos la URL final en el formulario
          onChange(result.secure_url);
          Alert.alert("¡Éxito!", "Video subido y optimizado.");
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo subir el video.");
      }
    }
  };
  return (
    <>
      <Pressable
        onPress={pickVideo}
        className=" flex flex-row active:opacity-80 bg-ui-input-light dark:bg-ui-input-dark items-center justify-center border border-dashed border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-6 gap-2"
      >
        <Upload color={ui.text.mutedDark} />
        <Text className=" text-center text-ui-text-muted dark:text-ui-text-mutedDark font-lexend tracking-tighter">
          Subir Video
        </Text>
      </Pressable>
    </>
  );
}
