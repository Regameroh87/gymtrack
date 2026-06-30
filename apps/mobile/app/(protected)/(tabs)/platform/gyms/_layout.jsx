import { Redirect } from "expo-router";

// Fallback nativo: la gestión de gimnasios es solo-web (ver _layout.web.jsx).
// En iOS/Android se redirige al panel de admin.
export default function GymsLayout() {
  return <Redirect href="/(protected)/(tabs)/admin" />;
}
