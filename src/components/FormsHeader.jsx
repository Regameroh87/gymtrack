import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { ChevronLeft } from "../../assets/icons";
import { ui } from "../theme/colors";

export default function SectionHeader({ title, subtitle, onBack }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className={`px-4 pb-2 ${onBack ? "pt-3" : "pt-6"}`}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="flex-row items-center mb-3 self-start active:opacity-60"
        >
          <ChevronLeft size={18} color={isDark ? ui.text.mutedDark : ui.text.muted} />
          <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark ml-0.5">
            Atrás
          </Text>
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
