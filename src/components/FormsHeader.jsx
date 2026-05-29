// React Native
import { Pressable, View, Text } from "react-native";

// Librerías externas
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

// Tema y assets
import { ui } from "../theme/colors";
import { ArrowLeft } from "../../assets/icons";

export default function FormsHeader({ title, subtitle, onBack }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  return (
    <View className="px-4" style={onBack ? { paddingTop: insets.top } : undefined}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          className="mb-3 self-start active:opacity-50"
        >
          <ArrowLeft size={22} color={isDark ? ui.text.mainDark : ui.text.main} />
        </Pressable>
      )}
      <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
        {title}
      </Text>
      <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
        {subtitle}
      </Text>
    </View>
  );
}
