import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";

export default function PreviewVideo({ videoUrl, children, onChange }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View className=" flex flex-row items-center justify-center h-52">
      {videoUrl ? (
        <View
          className=" relative w-full h-full"
          style={{ borderRadius: 12, position: "relative", overflow: "hidden" }}
        >
          <VideoView
            contentFit="cover"
            player={player}
            style={{ width: "100%", height: "100%" }}
          />
          <LinearGradient
            colors={["rgba(0,0,0,.2)", "rgba(0,0,0,0.7)"]}
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
        <View className=" flex flex-row items-center justify-center h-52">
          {children}
        </View>
      )}
    </View>
  );
}
