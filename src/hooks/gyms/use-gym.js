// Librerías externas
import { useQuery } from "@tanstack/react-query";

// Auth y datos
import { useAuth } from "../../auth/lib/getSession";
import { supabase } from "../../database/supabase";

// Lee el gym del usuario autenticado (incluye branding: logo + theme).
// El gym_id sale del perfil (useAuth), no de una env var — la app es un solo
// build multitenant. Cacheado por TanStack Query; lo consume el GymThemeProvider.
export const useGym = () => {
  const { user } = useAuth();
  const gymId = user?.gym_id;

  return useQuery({
    queryKey: ["gym", gymId],
    enabled: !!gymId,
    staleTime: 1000 * 60 * 30, // el branding cambia rara vez
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("id, name, logo_url, theme_primary, theme_accent")
        .eq("id", gymId)
        .single();
      if (error) {
        console.warn("useGym: no se pudo leer el gym:", error.message);
        return null;
      }
      return data;
    },
  });
};
