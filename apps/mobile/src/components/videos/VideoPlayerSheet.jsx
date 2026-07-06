// React Native
import { View, Text, useWindowDimensions } from "react-native";
import { useState, useCallback } from "react";
import { useSheetBackHandler } from "../../hooks/use-sheet-back-handler";

// Librerías externas
import { BottomSheetModal, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useVideoPlayer, VideoView } from "expo-video";
import YoutubePlayer from "react-native-youtube-iframe";
import { useColorScheme } from "nativewind";

// Tema / assets
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../contexts/gym-theme-context";
import { Youtube, Play } from "../../../assets/icons";

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&\n?#]+)/);
  return match?.[1] ?? null;
}

function isYoutubeUrl(url) {
  return url?.includes("youtube.com") || url?.includes("youtu.be");
}

function StoragePlayer({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      nativeControls
    />
  );
}

const HEADER_HEIGHT = 56;
const SNAP_POINTS = ["60%"];

export default function VideoPlayerSheet({ sheetRef, videoUrl, title }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandPrimary } = useGymTheme();
  const { width } = useWindowDimensions();

  const [isOpen, setIsOpen] = useState(false);
  useSheetBackHandler(sheetRef, isOpen);

  const videoHeight = Math.round((width * 9) / 16);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const isYoutube = isYoutubeUrl(videoUrl);
  const youtubeId = isYoutube ? extractYoutubeId(videoUrl) : null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onChange={(index) => setIsOpen(index >= 0)}
      backgroundStyle={{
        backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark
          ? ui.surfaceSecondary.dark
          : ui.surfaceSecondary.light,
        width: 40,
        height: 4,
        borderRadius: 2,
      }}
    >
      {/* Título */}
      <View
        style={{
          height: HEADER_HEIGHT,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        {isYoutube ? (
          <Youtube size={16} color="#ff4d4d" />
        ) : (
          <Play size={16} color={brandPrimary[500]} />
        )}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: "PlusJakartaSans_700Bold",
            color: isDark ? ui.text.mainDark : ui.text.main,
          }}
        >
          {title ?? "Video"}
        </Text>
      </View>

      {/* Reproductor */}
      <View style={{ height: videoHeight, backgroundColor: "#000" }}>
        {isOpen && videoUrl ? (
          isYoutube && youtubeId ? (
            <YoutubePlayer
              videoId={youtubeId}
              height={videoHeight}
              width={width}
              play={isOpen}
            />
          ) : !isYoutube ? (
            <StoragePlayer url={videoUrl} />
          ) : null
        ) : null}
      </View>
    </BottomSheetModal>
  );
}
