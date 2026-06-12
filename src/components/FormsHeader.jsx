// React Native
import { View, Text, Platform } from "react-native";

export default function FormsHeader({ title, subtitle }) {
  return (
    <View className={`px-4 ${Platform.OS === "ios" ? "py-4" : ""}`}>
      <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
        {title}
      </Text>
      <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
        {subtitle}
      </Text>
    </View>
  );
}
