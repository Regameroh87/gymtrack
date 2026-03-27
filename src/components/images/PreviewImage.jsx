import { Image } from "expo-image";
import { View, Text } from "react-native";
import { ui } from "../../theme/colors";
import { Photo } from "../../../assets/icons";
import { useTheme } from "../../theme/theme";

export default function PreviewImage({ value }) {
  const { isDark } = useTheme();
  return (
    <View className="items-center justify-center mb-4 bg-ui-surface-dimLight dark:bg-slate-950 h-44 rounded-xl overflow-hidden">
      {value ? (
        <Image
          source={{ uri: value }}
          style={{ width: "100%", height: "100%", borderRadius: 12 }}
        />
      ) : (
        <>
          <Photo color={isDark ? "#334155" : ui.text.muted} size={33} />
          <Text className="font-manrope-bold mt-2 text-ui-text-muted dark:text-slate-700 text-tiny">
            Sin Previsualización
          </Text>
        </>
      )}
    </View>
  );
}
