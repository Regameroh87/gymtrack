import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";

export default function PreviewVideo({ videoUrl, children, onChange }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View className="flex flex-row items-center justify-center h-52">
      {videoUrl ? (
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
        <View className="flex flex-row items-center justify-center w-full h-52 bg-ui-surface-highLight dark:bg-ui-surface-highDark rounded-2xl">
          {children}
        </View>
      )}
    </View>
  );
}
