// Librerías externas
import { useQuery } from "@tanstack/react-query";

// Datos
import { getSupabaseClient } from "../../supabase.js";

// Lee un gym por id (incluye branding: logo + theme). El gymId lo pasa el caller
// (en móvil sale del contexto de gym activo / memberships; en web del routing o
// del provider de la web), así el hook queda agnóstico de plataforma. Cacheado
// por TanStack Query; lo consume el GymThemeProvider.
export const useGym = (gymId) =>
  useQuery({
    queryKey: ["gym", gymId],
    enabled: !!gymId,
    staleTime: 1000 * 60 * 30, // el branding cambia rara vez
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("gyms")
        .select(
          "id, name, logo_url, logo_url_dark, theme_primary, theme_accent, header_logo_size, header_logo_position, header_content, default_catalog"
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
