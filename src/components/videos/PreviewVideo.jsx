import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { gradient } from "../../theme/colors";
import YoutubePlayer from "react-native-youtube-iframe";

export default function PreviewVideo({ videoUrl, children }) {
  const { colorScheme } = useColorScheme();
  const isYoutube = videoUrl.includes("youtube.com");
  console.log(videoUrl);

  const isDark = colorScheme === "dark";
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View className="flex flex-row items-center justify-center h-52">
      {isYoutube ? (
        <View
          className="relative w-full h-full"
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <YoutubePlayer
            videoId={videoUrl.split("v=")[1]}
            height={"100%"}
            width={"100%"}
          />
          <LinearGradient
            colors={["rgba(12, 10, 29, 0.15)", "rgba(12, 10, 29, 0.65)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "100%",
              zIndex: 10,
            }}
            pointerEvents="none"
          />
        </View>
      ) : videoUrl ? (
        <View
          className="relative w-full h-full"
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <VideoView
            contentFit="cover"
            player={player}
            style={{ width: "100%", height: "100%" }}
          />
          {/* Gradient overlay — indigo-tinted instead of pure black */}
          <LinearGradient
            colors={["rgba(12, 10, 29, 0.15)", "rgba(12, 10, 29, 0.65)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "100%",
              zIndex: 10,
            }}
            pointerEvents="none"
          />
        </View>
      ) : (
        <View
          className="flex-1 items-center justify-center overflow-hidden bg-ui-surface-dimLight dark:bg-slate-950"
          style={{
            borderRadius: 8,
            height: 172,
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? gradient.previewYoutube.dark
                : gradient.previewYoutube.light
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
          {children}
        </View>
      )}
    </View>
  );
}
