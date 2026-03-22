import { Modal, View, Pressable, useWindowDimensions } from "react-native";
import { X } from "../../assets/icons";
import { useVideoPlayer, VideoView } from "expo-video";
import YoutubePlayer from "react-native-youtube-iframe";

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
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
};

export default function VideoPlayerModal({ visible, onClose, videoUrl }) {
  const { width } = useWindowDimensions();
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
            <View style={{ width: "100%", height: width * (9 / 16) }}>
              <YoutubePlayer
                height={width * (9 / 16)}
                play={true}
                videoId={getYouTubeId(videoUrl)}
                webViewProps={{
                  injectedJavaScript: `
                    var element = document.getElementsByClassName('ytp-chrome-top')[0];
                    if (element) {
                        element.style.display = 'none';
                    }
                  `,
                }}
              />
            </View>
          ) : (
            <CloudinaryPlayer url={videoUrl} />
          )}
        </View>
      </View>
    </Modal>
  );
}
