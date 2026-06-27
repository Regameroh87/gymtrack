// React Native
import { Alert, Platform, Pressable } from "react-native";

// Librerías
import * as Haptics from "expo-haptics";

// BD
import { supabase } from "../../database/supabase.js";

// Assets
import { Logout } from "../../../assets/icons.jsx";

export default function ButtonLogout({ size = 24, className = "" }) {
  const doLogout = async () => {
    // scope:'local' limpia la sesión local de inmediato sin esperar respuesta de
    // red (la variante global hace POST a /auth/v1/logout antes de limpiar, lo que
    // introduce 500ms–2s de latencia antes de que ProtectedLayout pueda redirigir).
    await supabase.auth.signOut({ scope: "local" });
  };

  const handlePress = () => {
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
      className={`p-3 border border-red-500/20 bg-red-500/10 rounded-full active:scale-95 transition-all ${className}`}
    >
      <Logout color="#ef4444" size={size} />
    </Pressable>
  );
}
