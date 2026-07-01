// React
import { useState } from "react";

// React Native
import { ActivityIndicator, Alert, Platform, Pressable } from "react-native";

// Librerías
import * as Haptics from "expo-haptics";

// Auth
import { performLogout } from "../../auth/lib/logout.js";

// Assets
import { Logout } from "../../../assets/icons.jsx";

export default function ButtonLogout({ size = 24, className = "" }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const doLogout = async () => {
    setIsLoggingOut(true);
    try {
      // performLogout sube los pendientes antes de salir (device compartido) y,
      // si no puede, ofrece la salida forzada. Maneja web internamente.
      await performLogout();
    } finally {
      // Si cerró sesión, ProtectedLayout desmonta este botón; si se canceló,
      // volvemos al estado normal.
      setIsLoggingOut(false);
    }
  };

  const handlePress = () => {
    if (isLoggingOut) return;

    if (Platform.OS === "web") {
      if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
        doLogout();
      }
      return;
    }

    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          doLogout();
        },
      },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLoggingOut}
      className={`p-3 border border-red-500/20 bg-red-500/10 rounded-full active:scale-95 transition-all ${isLoggingOut ? "opacity-50" : ""} ${className}`}
    >
      {isLoggingOut ? (
        <ActivityIndicator color="#ef4444" size={size} />
      ) : (
        <Logout color="#ef4444" size={size} />
      )}
    </Pressable>
  );
}
