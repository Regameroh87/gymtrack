import { useState, useRef, useEffect } from "react";
import { Pressable, Text, Alert, View, Animated } from "react-native";
import { Upload, Movie, Play, Trash } from "../../../assets/icons";
import { brandPrimary, ui } from "../../theme/colors";
import PreviewVideo from "../videos/PreviewVideo";
import { supabase } from "../../database/supabase";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../utils/uploadFileToCloudinary";

export default function InputUploadVideo({
  value,
  onChange,
  onIdChange,
  publicId,
}) {
  const { pickMedia } = useMediaPicker();
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
    const videoFile = await pickMedia({
      mediaTypes: ["videos"],
      maxFileSizeMb: 50,
      permissionDeniedText:
        "Para subir un video de tus ejercicios, necesitamos acceso a tu galería.",
    });

    if (videoFile) {
      onChange(videoFile.uri);
      setVideoInfo(null);
      setIsUploading(true);
      console.log("enviando video a cloudinary...");
      try {
        const { url, public_id, result } = await uploadFileToCloudinary({
          fileUri: videoFile.uri,
          uploadPreset: "gymtrack_videos",
          typeFile: "video",
        });
        if (url && public_id) {
          //console.log("Video subido correctamente", result);
          onChange(url);
          onIdChange(public_id);
          setVideoInfo({
            name: result.original_filename,
            size: (result.bytes / 1024 / 1024).toFixed(2),
            duration: Math.round(result.duration),
            format: result.format,
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

  const deleteVideoFromCloudinary = async ({ public_id, resource_type }) => {
    const result = await supabase.functions.invoke("delete-cloudinary", {
      body: {
        public_id,
        resource_type,
      },
    });
    console.log("Respuesta de cloudinary", result);
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
              <Text
                className="text-ui-text-main dark:text-ui-text-mainDark font-lexend-bold text-sm w-56"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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
                <Pressable
                  onPress={() => {
                    onChange(null);
                    deleteVideoFromCloudinary({
                      public_id: publicId,
                      resource_type: "video",
                    });
                    onIdChange(null);
                  }}
                >
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
