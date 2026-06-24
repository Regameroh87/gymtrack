// React Native
import { View, Text } from "react-native";

// Librerías
import { Slot, Redirect, usePathname } from "expo-router";

// Hooks
import { useAuth } from "../../src/auth/lib/getSession";
import { useActiveGym } from "../../src/contexts/active-gym-context";

// Landing pública (solo web)
import LandingPage from "../../src/components/landing/landing-page.web";

export default function ProtectedLayoutWeb() {
  const { isLoggedIn, loading } = useAuth();
  const { needsSelection, loading: gymLoading } = useActiveGym();
  const pathname = usePathname();

  if (loading || gymLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando sesión...</Text>
      </View>
    );
  }

  // Sin sesión: en la web mostramos la landing pública en la raíz (no el login).
  // La URL permanece en "/", y "Iniciar sesión" navega a /login desde la landing.
  if (!isLoggedIn) {
    return <LandingPage />;
  }

  // Multi-gym: con más de una membresía y sin gym activo elegido, primero se
  // elige el gimnasio (el theme y los datos dependen del gym activo).
  if (needsSelection && pathname !== "/select-gym") {
    return <Redirect href="/select-gym" />;
  }

  return <Slot />;
}
