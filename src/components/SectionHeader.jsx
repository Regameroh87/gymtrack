// React Native
import { View, Text } from "react-native";

export default function SectionHeader({ title, subtitle }) {
  return (
    <View className="px-4 pt-6 pb-2">
      <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
        {title}
      </Text>
      <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
        {subtitle}
      </Text>
    </View>
  );
}
