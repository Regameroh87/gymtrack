import { Stack, Redirect, usePathname } from "expo-router";
import { useAuth } from "../../src/auth/lib/getSession";
import { useActiveGym } from "../../src/contexts/active-gym-context";
import { View, Text, Platform, Pressable } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ui } from "../../src/theme/colors.js";
import { useTheme } from "../../src/theme/theme";
import { supabase } from "../../src/database/supabase";

export default function ProtectedLayout() {
  const { isLoggedIn, loading, user } = useAuth();
  const {
    needsSelection,
    confirmedNoGym,
    loading: gymLoading,
  } = useActiveGym();
  const { isDark } = useTheme();
  const pathname = usePathname();

  if (loading || gymLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando sesión...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  // Sin gimnasio: el servidor confirmó que la persona no tiene ninguna membership
  // (su gym fue eliminado o la sacaron de todos). Toda la UI de tabs depende de un
  // gym activo, así que en vez de entrar a un estado vacío se muestra un aviso. Se
  // usa confirmedNoGym (query isSuccess + vacía), no memberships.length, para no
  // bloquear a un socio offline con gym válido (preserva el offline-first).
  // El super_admin NO cae acá: aunque no tenga membership, entra al selector de
  // todos los gyms (needsSelection lo redirige) para inspeccionar cualquiera.
  if (confirmedNoGym && !user?.is_super_admin) {
    return <NoGymScreen />;
  }

  // Multi-gym: con más de una membresía y sin gym activo elegido, primero se
  // elige el gimnasio (el theme y los datos dependen del gym activo).
  if (needsSelection && pathname !== "/select-gym") {
    return <Redirect href="/select-gym" />;
  }

  return (
    <BottomSheetModalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="select-gym" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="profile/index"
          options={{
            headerShown: Platform.OS === "ios",
            headerBackButtonDisplayMode: "minimal",
            headerTitle: "",
            headerTintColor: isDark ? ui.text.mainDark : ui.text.main,
          }}
        />
      </Stack>
    </BottomSheetModalProvider>
  );
}

// Aviso para una sesión de socio sin gimnasio usable (gym eliminado o sin
// membership). No deja entrar a la app y ofrece cerrar sesión. El super_admin
// no llega acá: tiene su propio selector de todos los gyms.
function NoGymScreen() {
  const title = "Sin gimnasio";
  const message =
    "Tu gimnasio ya no está disponible. Si creés que es un error, contactá a tu gimnasio.";

  return (
    <View className="flex-1 items-center justify-center px-8 bg-ui-background-light dark:bg-ui-background-dark">
      <Text className="text-[22px] font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark text-center mb-2 tracking-tight">
        {title}
      </Text>
      <Text className="text-[14px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center mb-8">
        {message}
      </Text>
      <Pressable
        onPress={() => supabase.auth.signOut().catch(() => {})}
        className="px-6 py-3.5 rounded-2xl bg-brandPrimary-600 active:opacity-80"
      >
        <Text className="text-[14px] font-manrope-bold text-white">
          Cerrar sesión
        </Text>
      </Pressable>
    </View>
  );
}
