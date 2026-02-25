import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/lib/authContext";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Lexend_400Regular,
  Lexend_700Bold,
  Lexend_300Light,
  Lexend_800ExtraBold,
} from "@expo-google-fonts/lexend";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_700Bold,
    Lexend_300Light,
    Lexend_800ExtraBold,
  });

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
