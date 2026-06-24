import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient } from "@gymtrack/core/supabase";

// Cliente Supabase del móvil: la construcción vive en @gymtrack/core (factory
// agnóstica); acá sólo inyectamos lo específico de Expo/RN (AsyncStorage como
// storage de auth, el polyfill de URL y las env EXPO_PUBLIC_*).
export const supabase = createSupabaseClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  storage: AsyncStorage,
});
