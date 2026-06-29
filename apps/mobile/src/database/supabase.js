import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createSupabaseClient,
  setSupabaseClient,
} from "@gymtrack/core/supabase";

// Cliente Supabase del móvil: la construcción vive en @gymtrack/core (factory
// agnóstica); acá sólo inyectamos lo específico de Expo/RN (AsyncStorage como
// storage de auth, el polyfill de URL y las env EXPO_PUBLIC_*).
export const supabase = createSupabaseClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  storage: AsyncStorage,
});

// Auto-refresh del token atado al foreground (patrón oficial de Expo + Supabase
// para RN). En vez de dejar el timer interno corriendo siempre, lo arrancamos
// sólo con la app activa y lo paramos en background: el refresh no compite por el
// processLock de auth mientras la app está inactiva y se dispara de forma
// predecible al volver al frente.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
if (AppState.currentState === "active") {
  supabase.auth.startAutoRefresh();
}

// Registra el cliente en core para que los hooks de datos agnósticos lo
// consuman vía getSupabaseClient(). Este módulo se importa temprano (AuthProvider
// lo trae al boot), así que queda configurado antes de cualquier query.
setSupabaseClient(supabase);
