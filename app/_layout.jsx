import "../global.css";
import "../src/theme/nativewind";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Lexend_400Regular,
  Lexend_700Bold,
  Lexend_300Light,
  Lexend_800ExtraBold,
} from "@expo-google-fonts/lexend";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { View, Text } from "react-native";
import Screen from "../src/components/Screen";
import { useColorScheme } from "nativewind";
import {
  ThemeProvider,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";

const queryClient = new QueryClient();

// Evita que el splash se oculte solo
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_700Bold,
    Lexend_300Light,
    Lexend_800ExtraBold,
    // Design System: Editorial Typography
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    // Se oculta el Splash cuando las fuentes están listas (o fallaron) Y el auth terminó de cargar
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
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <Screen>
              <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="(protected)"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
              <Toast config={toastConfig} />
            </Screen>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
