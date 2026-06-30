// React
import { useState } from "react";

// React Native
import { ActivityIndicator, Alert, Platform, Pressable } from "react-native";

// Librerías
import * as Haptics from "expo-haptics";

// BD
import { supabase } from "../../database/supabase.js";

// Assets
import { Logout } from "../../../assets/icons.jsx";

export default function ButtonLogout({ size = 24, className = "" }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const doLogout = async () => {
    setIsLoggingOut(true);
    try {
      // En device compartido, el próximo login de otra cuenta purga la base
      // local: subimos los cambios pendientes ANTES de salir para no perderlos.
      // En web no hay SQLite local (se consulta Supabase directo), así que no
      // hay nada que sincronizar.
      const sync =
        Platform.OS === "web" ? null : require("../../database/sync");
      if (sync) await sync.flushPendingBeforeLogout();
    } catch (e) {
      // Pendientes sin subir: abortamos el logout y avisamos. No se cierra
      // sesión para no perder los cambios al entrar otra cuenta en este device.
      setIsLoggingOut(false);
      Alert.alert("No se pudo cerrar sesión", e.message);
      return;
    }

    // scope:'local' limpia la sesión local de inmediato sin esperar respuesta de
    // red (la variante global hace POST a /auth/v1/logout antes de limpiar, lo que
    // introduce 500ms–2s de latencia antes de que ProtectedLayout pueda redirigir).
    await supabase.auth.signOut({ scope: "local" });
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
