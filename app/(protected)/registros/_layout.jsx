// Librerías externas
import { Stack } from "expo-router";

export default function RegistrosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="nuevo" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
