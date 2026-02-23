import { SafeAreaView } from "react-native-safe-area-context";

const Screen = ({ children }) => {
  return <SafeAreaView>{children}</SafeAreaView>;
};

export default Screen;
