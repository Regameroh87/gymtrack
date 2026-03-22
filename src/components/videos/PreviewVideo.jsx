import {
  View,
  ImageBackground,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
//import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Youtube, Pencil } from "../../../assets/icons";
import { ui } from "../../theme/colors";
import { isYouTube, getYouTubeId } from "../../utils/videoHelpers";

export default function PreviewVideo({ videoUrl, children, onChange }) {
  //
  const getVideoThumbnail = (videoUrl) => {
    if (!videoUrl) return null;

    if (isYouTube(videoUrl)) {
      const videoId = getYouTubeId(videoUrl);
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    // Si es Cloudinary: transformamos la extensión a .jpg pero MANTENEMOS /video/
    let thumbnail = videoUrl;
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
    <View className=" flex flex-row items-center justify-center border h-52 border-ui-input-border dark:border-ui-input-borderDark rounded-[12px] gap-2">
      {!videoUrl ? (
        children
      ) : (
        <ImageBackground
          source={{ uri: getVideoThumbnail(videoUrl) }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 12,
            overflow: "hidden",
            marginTop: 0,
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
            onPress={() => console.log("Reproducir el video")}
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
            <Link href={videoUrl} asChild>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className=" text-ui-text-mainDark font-lexend text-xs"
              >
                {videoUrl}
              </Text>
            </Link>
          </View>
        </ImageBackground>
      )}
    </View>
  );
}
