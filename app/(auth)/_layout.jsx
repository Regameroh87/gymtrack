import { Stack } from "expo-router";
import { Platform } from "react-native";
export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="verify"
        options={{
          headerShown: false,
          presentation: Platform.OS === "ios" ? "pageSheet" : "formSheet",
          sheetAllowedDetents: [0.5, 0.7],
          sheetGrabberVisible: true,
          gestureEnabled: true,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
