import { Stack } from "expo-router";
import { Platform } from "react-native";
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: Platform.OS === "android" }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
