import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Lexend_400Regular,
  Lexend_700Bold,
  Lexend_300Light,
  Lexend_800ExtraBold,
} from "@expo-google-fonts/lexend";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, Text } from "react-native";
import Screen from "../src/components/Screen";
const queryClient = new QueryClient();

// Evita que el splash se oculte solo
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Lexend-Regular": Lexend_400Regular,
    "Lexend-Bold": Lexend_700Bold,
    "Lexend-Light": Lexend_300Light,
    "Lexend-ExtraBold": Lexend_800ExtraBold,
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
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />

        <Screen safe>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                title: "Registrar usuario",
                headerTitleAlign: "center",
              }}
            />
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
