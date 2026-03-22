import {
  View,
  ImageBackground,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
//import { useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";

import { isYouTube, getYouTubeId } from "../../utils/videoHelpers";

export default function PreviewVideo({ videoUrl, children, onChange }) {
  /*   const getVideoThumbnail = (videoUrl) => {
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
  }; */
  console.log("URL", videoUrl);
  const player = useVideoPlayer(videoUrl, (p) => {
    p.looping = true;
    p.play();
  });

  return (
    <View className=" flex flex-row items-center justify-center h-52">
      {videoUrl ? (
        <VideoView
          contentFit="cover"
          player={player}
          style={{ width: "100%", height: "100%", borderRadius: 12 }}
        />
      ) : (
        <View className=" flex flex-row items-center justify-center h-52">
          {children}
        </View>
      )}
    </View>
  );
}
