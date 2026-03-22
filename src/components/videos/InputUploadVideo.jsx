import * as ImagePicker from "expo-image-picker";
//import { useState } from "react";
import {
  Pressable,
  Text,
  Alert,
  Linking,
  View,
  //ActivityIndicator,
} from "react-native";
import { Upload, Movie, Play } from "../../../assets/icons";
import { brandPrimary, ui } from "../../theme/colors";
//import VideoPlayerModal from "../videos/VideoPlayerModal";
//import { isYouTube, getYouTubeId } from "../../utils/videoHelpers";
import PreviewVideo from "../videos/PreviewVideo";

export default function InputUploadVideo({ value, onChange }) {
  //const [modalVisible, setModalVisible] = useState(false);
  //const [loading, setLoading] = useState(false);
  const UPLOAD_PRESET = "gymtrack_videos";

  const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  const saveVideoToCloudinary = async () => {
    if (!status?.granted) {
      const permission = await requestPermission();
      if (!permission.granted) {
        if (permission.canAskAgain) {
          Alert.alert(
            "Permiso necesario",
            "Para subir un video de tus ejercicios, necesitamos acceso a tu galería."
          );
        } else {
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

      // Limitar a 50MB (50 * 1024 * 1024 bytes)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (videoFile.fileSize && videoFile.fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          "Archivo muy pesado",
          "Por favor elige un video que pese menos de 50MB."
        );
        return;
      }
      //setLoading(true);
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
          onChange(result.secure_url);
          //Alert.alert("¡Éxito!", "Video subido y optimizado.");
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo subir el video.");
      } finally {
        //setLoading(false);
      }
    }
  };

  return (
    <>
      <View className=" flex border border-l-4 border-brandPrimary-600 rounded-2xl p-4">
        <View className="flex-row items-center mb-4">
          <Movie color={brandPrimary[600]} className="ml-4" />
          <Text className="text-ui-text-main dark:text-ui-text-mainDark font-lexend tracking-tighter ml-2">
            CARGAR VIDEO
          </Text>
        </View>
        {/* Esqueleton de previsualizacion */}
        <PreviewVideo videoUrl={value} onChange={onChange}>
          <View className=" flex items-center justify-center border border-ui-input-border dark:border-ui-input-borderDark rounded-full p-4 gap-2">
            <Play color={ui.text.mutedDark} />
          </View>
        </PreviewVideo>

        {/* input para subir video */}
        <View className=" gap-4">
          <Pressable
            onPress={saveVideoToCloudinary}
            className=" flex flex-row active:opacity-80 bg-ui-input-light dark:bg-ui-input-dark items-center justify-center border border-dashed border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-6 gap-2"
          >
            <Upload color={ui.text.mutedDark} />
            <Text className=" text-center text-ui-text-muted dark:text-ui-text-mutedDark font-lexend tracking-tighter">
              Subir Video
            </Text>
          </Pressable>
        </View>
      </View>
      {/*  <VideoPlayerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        videoUrl={value}
      /> */}
    </>
  );
}
