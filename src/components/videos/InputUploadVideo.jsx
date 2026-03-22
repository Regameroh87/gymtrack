import * as ImagePicker from "expo-image-picker";
import { useState, useRef, useEffect } from "react";
import { Pressable, Text, Alert, View, Linking, Animated } from "react-native";
import { Upload, Movie, Play, Trash } from "../../../assets/icons";
import { brandPrimary, ui } from "../../theme/colors";
import PreviewVideo from "../videos/PreviewVideo";

export default function InputUploadVideo({ value, onChange }) {
  const UPLOAD_PRESET = "gymtrack_videos";
  const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
  const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();
  const [videoInfo, setVideoInfo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    if (isUploading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(uploadAnim, {
            toValue: -10,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(uploadAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      uploadAnim.setValue(0);
    }
    return () => animation?.stop();
  }, [isUploading]);

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
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (videoFile.fileSize && videoFile.fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          "Archivo muy pesado",
          "Por favor elige un video que pese menos de 50MB."
        );
        return;
      }
      onChange(videoFile.uri); // Previsualización local inmediata
      setVideoInfo(null);
      setIsUploading(true);
      console.log("enviando video a cloudinary...");

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
        const uploadResult = await response.json();
        if (uploadResult.secure_url) {
          onChange(uploadResult.secure_url);
          setVideoInfo({
            name: uploadResult.original_filename,
            size: (uploadResult.bytes / 1024 / 1024).toFixed(2),
            duration: Math.round(uploadResult.duration),
            format: uploadResult.format,
          });
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo subir el video.");
      } finally {
        setIsUploading(false);
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
        <PreviewVideo videoUrl={value} onChange={onChange}>
          <View className=" flex items-center justify-center border border-ui-input-border dark:border-ui-input-borderDark rounded-full p-4 gap-2">
            <Play color={ui.text.mutedDark} />
          </View>
        </PreviewVideo>
        {value && videoInfo ? (
          <View className="mt-4 p-4 bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border dark:border-ui-input-borderDark rounded-xl">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-ui-text-main dark:text-ui-text-mainDark font-lexend-bold text-sm">
                {videoInfo.name}.{videoInfo.format}
              </Text>
              <View className="bg-brandPrimary-600/20 px-2 py-1 rounded-md">
                <Text className="text-brandPrimary-600 text-[10px] font-lexend-bold uppercase">
                  {videoInfo.format}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center">
              <View className=" flex-row gap-4">
                <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend">
                  Peso: {videoInfo.size} MB
                </Text>
                <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend">
                  Duración: {videoInfo.duration} seg
                </Text>
              </View>
              <View className=" mr-2">
                <Pressable onPress={() => onChange(null)}>
                  <Trash color={ui.text.mutedDark} size={16} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : isUploading ? (
          <View className="mt-4 p-6 bg-brandPrimary-600/5 rounded-xl border border-dashed border-brandPrimary-600/30 flex-row items-center justify-center gap-4">
            <Animated.View style={{ transform: [{ translateY: uploadAnim }] }}>
              <Upload color={brandPrimary[600]} size={24} />
            </Animated.View>
            <View className="flex-row items-center gap-2">
              <Text className="text-brandPrimary-600 font-lexend-bold text-sm tracking-widest">
                SUBIENDO...
              </Text>
            </View>
          </View>
        ) : (
          <View className=" mt-4 gap-4">
            <Pressable
              onPress={saveVideoToCloudinary}
              className=" flex flex-row active:opacity-80 bg-ui-input-light dark:bg-ui-input-dark items-center justify-center border border-dashed border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-6 gap-2"
            >
              <Upload color={ui.text.mutedDark} />
              <Text className=" text-center text-ui-text-muted dark:text-ui-text-mutedDark font-lexend tracking-tighter">
                Subir archivo de video
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}
