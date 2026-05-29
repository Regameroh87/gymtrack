// React Native
import { View, Text } from "react-native";

// Librerías externas
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FormsHeader({ title, subtitle }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="px-4" style={{ paddingTop: insets.top }}>
      <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
        {title}
      </Text>
      <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
        {subtitle}
      </Text>
    </View>
  );
}
