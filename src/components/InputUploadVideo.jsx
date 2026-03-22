import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Pressable,
  Text,
  Alert,
  Linking,
  TextInput,
  View,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { Upload, Youtube, Movie, Pencil } from "../../assets/icons";
import { brandPrimary, ui } from "../theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import VideoPlayerModal from "./VideoPlayerModal";
import { isYouTube, getYouTubeId } from "../utils/videoHelpers";

export default function InputUploadVideo({ value, onChange, youTube = true }) {
  const [modalVisible, setModalVisible] = useState(false);
  const UPLOAD_PRESET = "gymtrack_videos";

  const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  const pickVideo = async () => {
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
          Alert.alert("¡Éxito!", "Video subido y optimizado.");
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo subir el video.");
      }
    }
  };

  const getVideoThumbnail = (videoUrl) => {
    if (!videoUrl) return null;

    if (isYouTube(videoUrl)) {
      const videoId = getYouTubeId(videoUrl);
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    // Si es Cloudinary: transformamos la extensión a .jpg pero MANTENEMOS /video/
    let thumbnail = videoUrl;

    // Buscamos el último punto para cambiar la extensión (.mp4 -> .jpg)
    // Usamos lastIndexOf para NO romper el "res.cloudinary.com"
    const lastDotIndex = thumbnail.lastIndexOf(".");
    if (lastDotIndex !== -1 && lastDotIndex > thumbnail.lastIndexOf("/")) {
      thumbnail = thumbnail.substring(0, lastDotIndex) + ".jpg";
    } else {
      thumbnail = thumbnail + ".jpg";
    }
    console.log(thumbnail);

    return thumbnail;
  };

  return (
    <>
      {!value ? (
        <View className=" flex border border-l-4 border-brandPrimary-600 rounded-2xl p-4">
          <View className="flex-row items-center mb-4">
            <Movie color={brandPrimary[600]} className="ml-4" />
            <Text className="text-ui-text-main dark:text-ui-text-mainDark font-lexend tracking-tighter ml-2">
              VIDEO (URL O SUBIR)
            </Text>
          </View>

          <View className=" gap-4">
            {youTube ? (
              <View className=" flex relative flex-row">
                <View className=" absolute top-0 left-0 translate-y-1/2 z-10 ml-2">
                  <Youtube color={ui.text.mutedDark} />
                </View>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  placeholderTextColor="#64748b"
                  className="pl-10 dark:bg-ui-input-dark bg-ui-input-light border border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-lexend"
                />
              </View>
            ) : null}
            <Pressable
              onPress={pickVideo}
              className=" flex flex-row active:opacity-80 bg-ui-input-light dark:bg-ui-input-dark items-center justify-center border border-dashed border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-6 gap-2"
            >
              <Upload color={ui.text.mutedDark} />
              <Text className=" text-center text-ui-text-muted dark:text-ui-text-mutedDark font-lexend tracking-tighter">
                Subir Video
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ImageBackground
          source={{ uri: getVideoThumbnail(value) }}
          style={{
            width: "100%",
            height: 240,
            borderRadius: 12,
            overflow: "hidden",
            marginTop: 16,
            backgroundColor: "#1e293b",
          }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ ...StyleSheet.absoluteFillObject }}
            pointerEvents="none"
          />
          <Pressable
            onPress={() => setModalVisible(true)}
            className=" absolute flex flex-row top-4 left-4 bg-red-500 rounded-lg p-2 gap-2 items-center "
          >
            <Youtube color={ui.text.mainDark} size={16} />
            <Text className="text-ui-text-mainDark font-lexend tracking-tighter">
              VIDEO
            </Text>
          </Pressable>
          <View className=" absolute top-4 right-4 bg-ui-secondary-dark/40 rounded-full">
            <Pressable onPress={() => onChange(null)} style={{ padding: 12 }}>
              <Pencil color={ui.text.mainDark} size={16} />
            </Pressable>
          </View>
          <View className=" absolute bottom-4 left-4 w-1/2">
            <Link href={value} asChild>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className=" text-ui-text-mainDark font-lexend text-xs"
              >
                {value}
              </Text>
            </Link>
          </View>
        </ImageBackground>
      )}

      <VideoPlayerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        videoUrl={value}
      />
    </>
  );
}
