// Librerías externas
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function PlanesLayout() {
  return <Stack screenOptions={{ headerShown: false }}></Stack>;
}
