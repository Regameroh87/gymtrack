import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Screen = ({ children }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      className="flex-1 items-center bg-black"
    >
      {children}
    </View>
  );
};

export default Screen;
