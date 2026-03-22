import { Modal, View, Pressable } from "react-native";
import { X } from "../../assets/icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";

function CloudinaryPlayer({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return (
    <VideoView
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      style={{ flex: 1 }}
    />
  );
}

const isYouTube = (url) => {
  if (!url) return false;
  return url.includes("youtube.com") || url.includes("youtu.be");
};

const getYouTubeId = (url) => {
  if (!url) return null;
  if (url.includes("v=")) return url.split("v=")[1]?.substring(0, 11);
  if (url.includes("youtu.be/"))
    return url.split("youtu.be/")[1]?.substring(0, 11);
  return null;
};

export default function VideoPlayerModal({ visible, onClose, videoUrl }) {
  if (!videoUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        <View className="p-4 items-end z-10 relative">
          <Pressable
            onPress={onClose}
            className="bg-white/20 p-2 rounded-full active:opacity-50"
          >
            <X color="#fff" size={24} />
          </Pressable>
        </View>
        <View className="flex-1 justify-center bg-black">
          {isYouTube(videoUrl) ? (
            <WebView
              source={{
                uri: `https://www.youtube.com/embed/${getYouTubeId(
                  videoUrl
                )}?autoplay=1&playsinline=1`,
              }}
              style={{ flex: 1, backgroundColor: "black" }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
            />
          ) : (
            <CloudinaryPlayer url={videoUrl} />
          )}
        </View>
      </View>
    </Modal>
  );
}
