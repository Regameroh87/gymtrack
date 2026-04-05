import { Image } from "expo-image";
import { View } from "react-native";

import { useTheme } from "../../theme/theme";

export default function PreviewImage({ value, children }) {
  const { isDark } = useTheme();
  return (
    <View className="items-center justify-center bg-ui-surfaceSecondary-light dark:bg-slate-950 h-full rounded-xl overflow-hidden">
      {value ? (
        <Image
          source={{ uri: value }}
          style={{ width: "100%", height: "100%", borderRadius: 12 }}
        />
      ) : (
        <>{children}</>
      )}
    </View>
  );
}
