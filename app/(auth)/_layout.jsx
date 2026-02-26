import { Stack } from "expo-router";
export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="verify"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.7, 0.9],
          sheetGrabberVisible: true,
          gestureEnabled: true,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
