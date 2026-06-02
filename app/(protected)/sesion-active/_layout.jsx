import { Stack } from "expo-router";

// `index` (preview) queda como ruta ancla: al navegar directo a `active`,
// expo-router coloca el preview debajo, así el back desde la activa va al preview.
export const unstable_settings = {
  initialRouteName: "index",
};

export default function SesionActiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        headerTitle: "",
      }}
    />
  );
}
