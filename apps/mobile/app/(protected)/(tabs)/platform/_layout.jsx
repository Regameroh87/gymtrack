import { Redirect } from "expo-router";

// Fallback nativo: la plataforma del super_admin es solo-web (ver _layout.web.jsx).
// En iOS/Android se redirige al inicio.
export default function PlatformLayout() {
  return <Redirect href="/" />;
}
