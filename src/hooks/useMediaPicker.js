import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

// Directorio persistente dentro del sandox de la app.
// Sobrevive reinicios y limpiezas de caché temporales.
const LOCAL_MEDIA_DIR = `${FileSystem.documentDirectory}gymtrack/media/`;

/**
 * Garantiza que el directorio de media exista antes de copiar archivos.
 */
const ensureMediaDirExists = async () => {
  const info = await FileSystem.getInfoAsync(LOCAL_MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_MEDIA_DIR, {
      intermediates: true,
    });
  }
};

export const useMediaPicker = () => {
  const [libraryStatus, requestLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();
  const [cameraStatus, requestCameraPermission] =
    ImagePicker.useCameraPermissions();

  /**
   * Solicita permisos, abre el picker y copia el archivo a almacenamiento
   * persistente. Devuelve el asset con `uri` apuntando al archivo local
   * persistido, o `null` si el usuario canceló / denegó permisos.
   */
  const pickMedia = async (options = {}) => {
    const {
      mediaTypes = ["images"],
      allowsEditing = true,
      aspect = [4, 3],
      quality = 0.8,
      maxFileSizeMb = null,
      permissionDeniedText = "Para continuar, necesitamos acceso a tu dispositivo.",
      source = "gallery", // "gallery" | "camera"
    } = options;

    // ── 1. PERMISOS ──────────────────────────────────────────────────────────
    const isCamera = source === "camera";
    const currentStatus = isCamera ? cameraStatus : libraryStatus;
    const requestPermission = isCamera
      ? requestCameraPermission
      : requestLibraryPermission;

    if (!currentStatus?.granted) {
      const permission = await requestPermission();
      if (!permission.granted) {
        const recurso = isCamera ? "cámara" : "galería";
        if (permission.canAskAgain) {
          Alert.alert("Permiso necesario", permissionDeniedText);
        } else {
          Alert.alert(
            "Permiso denegado",
            `Has desactivado el acceso a la ${recurso}. Activalo en los ajustes de tu teléfono.`,
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Ir a Ajustes", onPress: () => Linking.openSettings() },
            ]
          );
        }
        return null;
      }
    }

    // ── 2. SELECCIÓN ─────────────────────────────────────────────────────────
    const pickerFn = isCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await pickerFn({
      mediaTypes,
      allowsEditing,
      aspect,
      quality,
    });

    if (result.canceled) return null;

    const file = result.assets[0];

    // Validación de tamaño opcional
    if (maxFileSizeMb && file.fileSize) {
      if (file.fileSize > maxFileSizeMb * 1024 * 1024) {
        Alert.alert(
          "Archivo muy pesado",
          `El archivo debe pesar menos de ${maxFileSizeMb}MB.`
        );
        return null;
      }
    }

    // ── 3. PERSISTENCIA LOCAL (expo-file-system) ──────────────────────────────
    // La URI que devuelve ImagePicker apunta a un caché temporal.
    // Copiamos el archivo a documentDirectory para que sea permanente.
    await ensureMediaDirExists();

    const extension = file.uri.split(".").pop()?.split("?")[0] ?? "jpg";
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
    const persistentUri = `${LOCAL_MEDIA_DIR}${filename}`;

    await FileSystem.copyAsync({ from: file.uri, to: persistentUri });

    // Devolvemos el asset original pero con la URI persistente
    return { ...file, uri: persistentUri };
  };

  return { pickMedia };
};
