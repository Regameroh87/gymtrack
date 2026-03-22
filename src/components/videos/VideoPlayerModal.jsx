import { Modal, View, Pressable, useWindowDimensions } from "react-native";
import { X } from "../../../assets/icons";
import { useVideoPlayer, VideoView } from "expo-video";
import YoutubePlayer from "react-native-youtube-iframe";
import { isYouTube, getYouTubeId } from "../../utils/videoHelpers";
function CloudinaryPlayer({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return (
    <VideoView
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      style={{ width: "100%", height: "100%", backgroundColor: "black" }}
    />
  );
}

export default function VideoPlayerModal({ visible, onClose, videoUrl }) {
  const { width } = useWindowDimensions();
  if (!videoUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className=" absolute top-20 right-4 z-20">
        <Pressable
          onPress={onClose}
          className=" bg-ui-secondary-dark/40 p-2 rounded-full"
        >
          <X color="#fff" size={24} />
        </Pressable>
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "black",
        }}
      >
        {isYouTube(videoUrl) ? (
          <View style={{ width: "100%", height: width * (9 / 16) }}>
            <YoutubePlayer
              height={width * (9 / 16)}
              play={true}
              videoId={getYouTubeId(videoUrl)}
              forceAndroidAutoplay={true}
              webViewStyle={{ opacity: 0.99 }} // Hack crucial para Android WebView
            />
          </View>
        ) : (
          <CloudinaryPlayer url={videoUrl} />
        )}
      </View>
    </Modal>
  );
}
