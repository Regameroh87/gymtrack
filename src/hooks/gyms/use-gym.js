// Librerías externas
import { useQuery } from "@tanstack/react-query";

// Auth y datos
import { useActiveGym } from "../../contexts/active-gym-context";
import { supabase } from "../../database/supabase";

// Lee el gym ACTIVO del usuario (incluye branding: logo + theme). Con multi-gym
// el gym sale del contexto de gym activo (memberships), no del perfil ni de una
// env var. Cacheado por TanStack Query; lo consume el GymThemeProvider.
export const useGym = () => {
  const { gymId } = useActiveGym();

  return useQuery({
    queryKey: ["gym", gymId],
    enabled: !!gymId,
    staleTime: 1000 * 60 * 30, // el branding cambia rara vez
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select(
          "id, name, logo_url, logo_url_dark, theme_primary, theme_accent, header_logo_size, header_logo_position, header_content"
        )
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
