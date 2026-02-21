import { View } from "react-native";

const Screen = ({ children }) => {
  return <View className="flex-1 items-center pt-4">{children}</View>;
};

export default Screen;
