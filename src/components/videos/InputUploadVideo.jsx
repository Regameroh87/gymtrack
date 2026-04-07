import { useState, useRef, useEffect } from "react";
import { Pressable, Text, Alert, View, Animated } from "react-native";
import PreviewVideo from "../videos/PreviewVideo";
import { useColorScheme } from "nativewind";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import { brandPrimary, ui } from "../../theme/colors";
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";
import { Upload, Movie, Trash } from "../../../assets/icons";
import ButtonUploadAnimated from "../buttons/ButtonUploadAnimated";
import HeaderCard from "../cards/HeaderCard";

export default function InputUploadVideo({
  value,
  onChange,
  setVideoPublicId,
  videoPublicId,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { pickMedia } = useMediaPicker();
  const [cardInfo, setCardInfo] = useState(null);
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
  }, [isUploading, pulseAnim, uploadAnim]);

  const sendVideoToCloudinary = async () => {
    const videoFile = await pickMedia({
      mediaTypes: ["videos"],
      maxFileSizeMb: 50,
      permissionDeniedText:
        "Para subir un video de tus ejercicios, necesitamos acceso a tu galería.",
    });
    if (videoFile) {
      onChange(videoFile.uri);
      setIsUploading(true);
      try {
        const ext = videoFile.uri.split(".").pop() || "mp4";
        const fileName = `${Crypto.randomUUID()}.${ext}`;
        const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({ from: videoFile.uri, to: permanentUri });
        const info = await FileSystem.getInfoAsync(permanentUri);

        onChange(permanentUri);
        setVideoPublicId(""); // Lo vaciamos para que sync se encargue después
        
        setCardInfo({
          name: "Video de Ejercicio Local",
          size: info.exists ? (info.size / 1024 / 1024).toFixed(2) : null,
          format: ext.toUpperCase(),
        });
      } catch (error) {
        console.error("Error al guardar video local ❌:", error);
        Alert.alert("Error", "No se pudo preparar el video.");
        onChange(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <>
      <View className="rounded-2xl bg-ui-surface-light dark:bg-ui-surface-dark gap-4 p-4">
        <HeaderCard
          icon={<Movie color={brandPrimary[400]} size={20} />}
          title="Archivo Local"
          description="Subí un video desde tu dispositivo."
        />
        <PreviewVideo videoUrl={value}>
          <View className=" w-12 h-12 rounded-full dark:bg-slate-50 bg-brandPrimary-600 items-center justify-center">
            <Movie color={isDark ? brandPrimary[600] : "#ffffff"} size={25} />
          </View>
        </PreviewVideo>
        {/* ── Video info card (uploaded) ── */}
        {(value || videoPublicId) && !isUploading ? (
          <View className="p-4 rounded-xl bg-ui-surface-secondary-light dark:bg-ui-surface-secondary-dark">
            <View className="flex-row justify-between items-center mb-2">
              <Text
                className="font-manrope-bold text-sm w-56 text-ui-text-main dark:text-ui-text-mainDark"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cardInfo
                  ? `${cardInfo.name}.${cardInfo.format}`
                  : "Video cargado en base de datos"}
              </Text>
              {cardInfo?.format && (
                <View
                  className="px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: "rgba(48, 35, 205, 0.1)" }}
                >
                  <Text className="text-brandPrimary-600 text-[10px] font-manrope-bold uppercase tracking-label">
                    {cardInfo.format}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row gap-4">
                {cardInfo?.size && (
                  <Text
                    className="text-xs font-manrope"
                    style={{ color: ui.text.muted }}
                  >
                    {cardInfo.size} MB
                  </Text>
                )}
                {cardInfo?.duration ? (
                  <Text
                    className="text-xs font-manrope"
                    style={{ color: ui.text.muted }}
                  >
                    {cardInfo.duration}s
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  onChange(null);
                  setVideoPublicId(null);
                }}
                className="active:scale-[0.97] p-2"
              >
                <Trash color={ui.text.muted} size={16} />
              </Pressable>
            </View>
          </View>
        ) : (
          <ButtonUploadAnimated
            isUploading={isUploading}
            labelLoading="Subiendo video..."
            label="Subir archivo de video"
            onPress={sendVideoToCloudinary}
            backgroundColor="bg-brandPrimary-600/20"
            textColor="text-brandPrimary-600 dark:text-brandPrimary-300"
            backgroundColorAnimated="bg-brandPrimary-300"
            textColorAnimated="text-brandPrimary-600"
          >
            <Upload
              color={
                isDark && !isUploading ? brandPrimary[300] : brandPrimary[600]
              }
              size={16}
            />
          </ButtonUploadAnimated>
        )}
      </View>
    </>
  );
}
