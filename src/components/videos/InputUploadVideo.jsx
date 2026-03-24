import { useState, useRef, useEffect } from "react";
import { Pressable, Text, Alert, View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import { uploadFileToCloudinary } from "../../utils/uploadFileToCloudinary";
import { brandPrimary, ui } from "../../theme/colors";
import { Upload, Movie, Trash } from "../../../assets/icons";
import PreviewVideo from "../videos/PreviewVideo";

export default function InputUploadVideo({
  value,
  onChange,
  onIdChange,
  publicId,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { pickMedia } = useMediaPicker();
  const [videoInfo, setVideoInfo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let animation;
    let pulse;
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
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      pulse.start();
    } else {
      uploadAnim.setValue(0);
      pulseAnim.setValue(0.6);
    }
    return () => {
      animation?.stop();
      pulse?.stop();
    };
  }, [isUploading]);

  const sendVideoToCloudinary = async () => {
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
          console.log("Video subido correctamente a Cloudinary ✅ ");
          onIdChange(public_id);
          setVideoInfo({
            name: result.original_filename,
            size: (result.bytes / 1024 / 1024).toFixed(2),
            duration: Math.round(result.duration),
            format: result.format,
          });
        }
      } catch (error) {
        console.error("Error al subir el video a Cloudinary ❌:", error);
        Alert.alert("Error", "No se pudo subir el video.");
        onChange(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <>
      {/* Card container — padding:20, gap:16 vertical */}
      <View
        className="rounded-2xl"
        style={{
          backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
          padding: 20,
          gap: 16,
        }}
      >
        {/* Section header — icon + label, gap:8 */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Movie color={isDark ? "#c2c1ff" : brandPrimary[600]} size={16} />
          <Text
            className="font-jakarta-bold"
            style={{
              color: isDark ? "#cbd5e1" : ui.text.main,
              fontSize: 12,
            }}
          >
            Archivo Local
          </Text>
        </View>

        {/* Video preview area — gradient placeholder */}
        {value ? (
          <PreviewVideo videoUrl={value} onChange={onChange}>
            <View
              className="items-center justify-center"
              style={{
                backgroundColor: isDark ? "#020617" : ui.surface.dimLight,
                borderRadius: 8,
                height: 172,
              }}
            >
              <Movie color={isDark ? "#334155" : ui.text.muted} size={25} />
            </View>
          </PreviewVideo>
        ) : (
          <View
            className="items-center justify-center overflow-hidden"
            style={{
              backgroundColor: isDark ? "#020617" : ui.surface.dimLight,
              borderRadius: 8,
              height: 172,
            }}
          >
            <LinearGradient
              colors={
                isDark
                  ? ["#3023cd", "#0f172a"]
                  : [brandPrimary[200], brandPrimary[50]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: 1,
                left: 1,
                right: 1,
                bottom: 1,
                borderRadius: 7,
              }}
            />
            {/* Play button overlay */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 9999,
                backgroundColor: isDark
                  ? "rgba(255,255,255,1)"
                  : brandPrimary[600],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Movie color={isDark ? brandPrimary[600] : "#ffffff"} size={25} />
            </View>
          </View>
        )}

        {/* ── Video info card (uploaded) ── */}
        {value && videoInfo ? (
          <View
            className="p-4 rounded-xl"
            style={{
              backgroundColor: isDark
                ? ui.surface.highDark
                : ui.surface.highLight,
            }}
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text
                className="font-manrope-bold text-sm w-56"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: isDark ? ui.text.mainDark : ui.text.main,
                }}
              >
                {videoInfo.name}.{videoInfo.format}
              </Text>
              <View
                className="px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: "rgba(48, 35, 205, 0.1)" }}
              >
                <Text className="text-brandPrimary-600 text-[10px] font-manrope-bold uppercase tracking-label">
                  {videoInfo.format}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row gap-4">
                <Text
                  className="text-xs font-manrope"
                  style={{ color: ui.text.muted }}
                >
                  {videoInfo.size} MB
                </Text>
                <Text
                  className="text-xs font-manrope"
                  style={{ color: ui.text.muted }}
                >
                  {videoInfo.duration}s
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  onChange(null);
                  onIdChange(null);
                }}
                className="active:scale-[0.97] p-2"
              >
                <Trash color={ui.text.muted} size={16} />
              </Pressable>
            </View>
          </View>
        ) : isUploading ? (
          /* ── Uploading state ── */
          <Animated.View
            className="p-6 rounded-xl flex-row items-center justify-center gap-4"
            style={{
              backgroundColor: "rgba(48, 35, 205, 0.06)",
              opacity: pulseAnim,
            }}
          >
            <Animated.View style={{ transform: [{ translateY: uploadAnim }] }}>
              <Upload color={brandPrimary[600]} size={24} />
            </Animated.View>
            <Text className="text-brandPrimary-600 font-jakarta text-sm tracking-label">
              SUBIENDO...
            </Text>
          </Animated.View>
        ) : (
          /* ── Upload trigger — solid indigo button, 305x42 ── */
          <Pressable
            onPress={sendVideoToCloudinary}
            className="active:scale-[0.97]"
            style={{
              backgroundColor: "#6366f1",
              borderRadius: 12,
              height: 42,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Upload color={isDark ? "#a5b4fc" : "#ffffff"} size={11} />
            <Text
              className="font-manrope-semi"
              style={{
                color: isDark ? "#a5b4fc" : "#ffffff",
                fontSize: 12,
              }}
            >
              Subir archivo de video
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );
}
