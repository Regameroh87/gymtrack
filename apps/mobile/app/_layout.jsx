import "../global.css";
import "../src/theme/nativewind";
import "../src/storage-init";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { useKeepAwake } from "expo-keep-awake";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@gymtrack/core/query-client";
import { AuthProvider } from "../src/auth/lib/getSession";
import { useInitDatabase } from "../src/database";
import {
  startSyncListener,
  checkNetInfoAndSync,
} from "../src/database/sync";
import { View, Text, AppState } from "react-native";
import Screen from "../src/components/Screen";
import { useColorScheme } from "nativewind";
import {
  ThemeProvider,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GymThemeProvider } from "../src/contexts/gym-theme-context";
import { ActiveGymProvider } from "../src/contexts/active-gym-context";

// Evita que el splash se oculte solo
SplashScreen.preventAutoHideAsync();

// Error tracking. Sin DSN (dev local sin env) queda desactivado; en dev nunca
// reporta para no ensuciar el proyecto con errores de desarrollo.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN) && !__DEV__,
  environment: Constants.expoConfig?.extra?.appEnv ?? "production",
  tracesSampleRate: 0.2,
});

function KeepAwake() {
  useKeepAwake();
  return null;
}

function RootLayout() {
  const { colorScheme } = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    // Design System: Editorial Typography
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const isListenerStarted = useRef(false);
  const { success, error } = useInitDatabase();
  // El listener de reconexión arranca una sola vez en cuanto la DB está lista.
  // El sync inicial lo dispara ActiveGymProvider cuando gym + auth están disponibles,
  // garantizando que la query esté gym-scopeada desde el primer intento.
  useEffect(() => {
    if (success && !isListenerStarted.current) {
      isListenerStarted.current = true;
      startSyncListener();
    }
  }, [success]);

  // Sincroniza al traer la app al frente (background → active). El sync de
  // arranque corre una sola vez por proceso, así que sin esto un dispositivo ya
  // abierto no se entera de cambios hechos en otro device hasta un cold start.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        checkNetInfoAndSync().catch((e) => console.error("Sync failed", e));
        // Refresca las memberships (única fuente de gyms.is_active): si el gym
        // activo fue suspendido mientras la app estaba en background, el contexto
        // lo detecta y fuerza el logout. invalidateQueries refetchea aunque el
        // staleTime no haya vencido.
        queryClient.invalidateQueries({ queryKey: ["memberships"] });
        // Catálogo del selector del super_admin: capta gyms creados en otro
        // cliente mientras esta app estaba en background.
        queryClient.invalidateQueries({ queryKey: ["all-gyms"] });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Se oculta el Splash cuando las fuentes están listas (o fallaron)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);
  // Si las fuentes no están listas (y no fallaron) O el auth sigue cargando, mostramos nuestra vista de carga
  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Cargando aplicación...</Text>
      </View>
    );
  }

  if (error)
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-red-600 font-bold text-base mb-2">
          Error al inicializar la base de datos
        </Text>
        <Text className="text-gray-700 text-xs text-center">
          {error?.message ?? String(error)}
        </Text>
      </View>
    );
  if (!success)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Cargando...</Text>
      </View>
    );

  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        text1NumberOfLines={0} // <--- Esto es lo que activa el wrap
        text2NumberOfLines={0}
        style={{ borderLeftColor: "#84cc16" }} // Verde de tu marca
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 14, fontWeight: "700" }}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        text1NumberOfLines={0} // <--- Y aquí para los errores
        text2NumberOfLines={0}
        style={{ borderLeftColor: "#ef4444" }} // Rojo error
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 14, fontWeight: "700" }}
      />
    ),
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {__DEV__ && <KeepAwake />}
      <AuthProvider>
        <SafeAreaProvider>
          <KeyboardProvider statusBarTranslucent>
            <QueryClientProvider client={queryClient}>
              <ActiveGymProvider>
              <GymThemeProvider>
                <ThemeProvider
                  value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                >
                  <BottomSheetModalProvider>
                  <StatusBar
                    style={colorScheme === "dark" ? "light" : "dark"}
                    translucent
                  />
                  <Screen>
                    <Stack>
                      <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(protected)"
                        options={{
                          headerShown: false,
                        }}
                      />
                    </Stack>
                    <Toast config={toastConfig} />
                  </Screen>
                  </BottomSheetModalProvider>
                </ThemeProvider>
              </GymThemeProvider>
              </ActiveGymProvider>
            </QueryClientProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap agrega el error boundary raíz y el contexto de navegación.
export default Sentry.wrap(RootLayout);
