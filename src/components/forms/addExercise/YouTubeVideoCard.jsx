import { View, Text, TextInput } from "react-native";
import { Play, Link } from "../../../../assets/icons";
import { ui, brandPrimary } from "../../../theme/colors";
import PreviewVideo from "../../videos/PreviewVideo";
import { useColorScheme } from "nativewind";

/**
 * Card for the YouTube video section.
 * Receives form field value and handleChange via `value` and `onChange` props.
 */
export default function YouTubeVideoCard({ value, onChange }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className="rounded-2xl p-5 mb-4 border border-brandPrimary-400 border-l-4"
      style={{
        backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-5">
        <Play color={brandPrimary[400]} size={20} />
        <Text className="font-jakarta-bold ml-3 text-ui-text-main dark:text-slate-300 text-xs">
          YouTube Video
        </Text>
      </View>

      {/* Preview */}
      <View
        className="items-center justify-center overflow-hidden mb-4 bg-ui-surface-dimLight dark:bg-slate-950"
        style={{ borderRadius: 8, height: 172 }}
      >
        <PreviewVideo videoUrl={value}>
          <View className="w-12 h-12 rounded-full dark:bg-slate-50 bg-brandPrimary-600 items-center justify-center">
            <Play
              color={isDark ? brandPrimary[600] : "#ffffff"}
              size={25}
            />
          </View>
        </PreviewVideo>
      </View>

      {/* URL Input */}
      <View
        className="flex-row items-center overflow-hidden bg-ui-surface-highLight dark:bg-ui-surface-highDark"
        style={{ borderRadius: 12, height: 41 }}
      >
        <View className="pl-4">
          <Link color={ui.text.muted} size={15} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Pegar URL de YouTube..."
          placeholderTextColor={ui.text.muted}
          className="flex-1 px-3 font-manrope text-ui-text-main dark:text-ui-text-mainDark text-xs"
        />
      </View>
    </View>
  );
}
