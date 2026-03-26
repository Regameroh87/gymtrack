import { View } from "react-native";
import { forwardRef } from "react";
import { Play, Link } from "../../../../assets/icons";
import { ui, brandPrimary } from "../../../theme/colors";
import PreviewVideo from "../../videos/PreviewVideo";
import HeaderCard from "../../cards/HeaderCard";
import StyledInputCard from "../../cards/StyledInputCard";
import { useTheme } from "../../../utils/theme";

const YouTubeVideoCard = forwardRef(function YouTubeVideoCard(
  { value, onChange, onFocus },
  ref
) {
  const { isDark } = useTheme();

  return (
    <View
      ref={ref}
      className="rounded-2xl p-5 mb-4 border border-brandPrimary-400 border-l-4 bg-ui-surface-light dark:bg-ui-surface-dark"
    >
      <HeaderCard
        icon={<Play color={brandPrimary[400]} size={20} />}
        title="YouTube Video"
      />

      {/* Preview */}
      <View className="rounded-xl h-44 items-center justify-center overflow-hidden mb-4 bg-ui-surface-dimLight dark:bg-slate-950">
        <PreviewVideo videoUrl={value}>
          <View className="w-12 h-12 rounded-full dark:bg-slate-50 bg-brandPrimary-600 items-center justify-center">
            <Play color={isDark ? brandPrimary[600] : "#ffffff"} size={25} />
          </View>
        </PreviewVideo>
      </View>

      {/* URL Input */}
      <StyledInputCard
        icon={<Link color={ui.text.muted} size={15} />}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
      />
    </View>
  );
});

export default YouTubeVideoCard;
