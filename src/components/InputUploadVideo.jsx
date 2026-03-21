import * as ImagePicker from "expo-image-picker";
import { Pressable, Text, Alert, Linking } from "react-native";
import { Upload } from "../../assets/icons";
import { ui } from "../theme/colors";
export default function InputUploadVideo({ value, onChange }) {
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
      onChange(result.assets[0].uri);
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
