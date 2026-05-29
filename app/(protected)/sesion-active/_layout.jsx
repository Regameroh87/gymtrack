import { Stack } from "expo-router";

export default function SesionActiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
        headerTitle: "",
      }}
    />
  );
}
