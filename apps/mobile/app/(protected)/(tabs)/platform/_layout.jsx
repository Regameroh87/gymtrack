import { Redirect } from "expo-router";

// Fallback nativo: la plataforma del super_admin es solo-web (ver _layout.web.jsx).
// En iOS/Android se redirige al inicio. href="/" causaría Unmatched Route al
// no existir app/index.jsx; se usa la ruta canónica del home tab.
export default function PlatformLayout() {
  return <Redirect href="/(protected)/(tabs)/(home)/index" />;
}
