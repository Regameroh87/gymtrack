import "../global.css";
import { Slot } from "expo-router";
import { View } from "react-native";

export default function Layout() {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Slot />
    </View>
  );
}
