// ── React Native ──
import { View, Text, Platform } from "react-native";

// ── Components ──
import GymLogo from "./GymLogo";

export default function FormsHeader({ title, subtitle }) {
  return (
    <View
      className={`px-4 flex-row items-center justify-between ${Platform.OS === "ios" ? "py-4" : ""}`}
    >
      <View className="flex-1 mr-3">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
          {title}
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
          {subtitle}
        </Text>
      </View>
      <GymLogo size={30} />
    </View>
  );
}
