import { View } from "react-native";

const Screen = ({ children }) => {
  return <View className="flex-1 items-center">{children}</View>;
};

export default Screen;
