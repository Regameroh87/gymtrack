import { Redirect } from "expo-router";

// Fallback nativo: la plataforma del super_admin es solo-web (ver _layout.web.jsx).
// En iOS/Android se redirige al inicio. El home vive en (home)/index, que con los
// grupos colapsados ES la raíz "/"; expo-router no acepta los grupos "(...)" ni el
// segmento literal "index" en el href.
export default function PlatformLayout() {
  return <Redirect href="/" />;
}
