import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

export const useMediaPicker = () => {
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  const pickMedia = async (options = {}) => {
    const {
      mediaTypes = ["images"],
      allowsEditing = true,
      aspect = [4, 3],
      quality = 1,
      maxFileSizeMb = null,
      permissionDeniedText = "Para seleccionar un archivo, necesitamos acceso a tu galería.",
    } = options;

    if (!status?.granted) {
      const permission = await requestPermission();
      if (!permission.granted) {
        if (permission.canAskAgain) {
          Alert.alert("Permiso necesario", permissionDeniedText);
        } else {
          Alert.alert(
            "Permiso denegado",
            "Has desactivado el acceso a la galería. Por favor actívalo en los ajustes de tu teléfono.",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Ir a Ajustes", onPress: () => Linking.openSettings() },
            ]
          );
        }
        return null;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaTypes,
      allowsEditing: allowsEditing,
      aspect: aspect,
      quality: quality,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];

    if (maxFileSizeMb && file.fileSize) {
      const MAX_FILE_SIZE = maxFileSizeMb * 1024 * 1024;
      if (file.fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          "Archivo muy pesado",
          `Por favor elige un archivo que pese menos de ${maxFileSizeMb}MB.`
        );
        return null;
      }
    }

    return file;
  };

  return { pickMedia };
};
