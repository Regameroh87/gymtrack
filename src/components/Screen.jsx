import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";

const Screen = ({ children, safe = false, className = "" }) => {
  const insets = useSafeAreaInsets();
  const paddingTop = safe ? insets.top : 0;
  return (
    <View className={`${className || ""} flex-1`} style={{ paddingTop }}>
      {children}
    </View>
  );
};

export default Screen;
