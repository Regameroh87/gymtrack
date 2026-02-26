import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/lib/authContext";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Lexend_400Regular,
  Lexend_700Bold,
  Lexend_300Light,
  Lexend_800ExtraBold,
} from "@expo-google-fonts/lexend";
import * as SplashScreen from "expo-splash-screen";

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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen
              name="verify"
              options={{
                headerShown: false,
                presentation: "formSheet",
                sheetAllowedDetents: [0.5, 0.9], // Sube al 50% y permite expandir al 90%
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="(protected)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="verify" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </>
  );
}
