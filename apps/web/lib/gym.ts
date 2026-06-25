// Subconjunto público de un gym (lo que devuelve la RPC get_public_gym).
export type PublicGym = {
  slug: string;
  name: string;
  logo_url: string | null;
  logo_url_dark: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
};

// Lee un gym activo por slug. Devuelve null si no existe / no está activo.
// Importa el cliente de forma perezosa: si faltan las env vars (p. ej. durante
// el build) el módulo supabase lanza al cargarse, así que lo atrapamos acá en
// vez de tumbar la página.
export async function getPublicGym(slug: string): Promise<PublicGym | null> {
  try {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase.rpc("get_public_gym", {
      p_slug: slug,
    });
    if (error) {
      console.error("[getPublicGym]", error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return (row as PublicGym) ?? null;
  } catch (e) {
    console.error("[getPublicGym]", (e as Error).message);
    return null;
  }
}

// Lista de gyms activos (para el sitemap). Resiliente: ante falta de env vars o
// fallo de red devuelve [], para no romper la generación del sitemap en build.
export async function listPublicGyms(): Promise<
  { slug: string; updated_at: string }[]
> {
  try {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase.rpc("list_public_gyms");
    if (error) {
      console.error("[listPublicGyms]", error.message);
      return [];
    }
    return (data as { slug: string; updated_at: string }[]) ?? [];
  } catch (e) {
    console.error("[listPublicGyms]", (e as Error).message);
    return [];
  }
}

// Normaliza un Instagram (@user o URL) a una URL absoluta para `sameAs`/links.
export function instagramUrl(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}
