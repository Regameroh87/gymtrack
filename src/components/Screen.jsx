import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

const Screen = ({ children, safe = false, className = "" }) => {
  const Container = safe ? SafeAreaView : View;
  return (
    <Container className={`${className || ""} flex-1 px-4`}>
      {children}
    </Container>
  );
};

export default Screen;
