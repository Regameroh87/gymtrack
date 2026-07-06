// Helpers compartidos del CRUD de gimnasios (panel de plataforma del super_admin).
// Portados de apps/mobile platform/gyms/_form.jsx + hooks de @gymtrack/core/hooks/gyms.
// En web no hay TanStack Query/Form ni react-native: las mutaciones usan el cliente
// browser de Supabase; todo el media va a Supabase Storage (bucket "media").

import { getBrowserSupabase } from "./supabase-browser";
import { optimizeImageFile } from "./optimize-image";

// Defaults del GymThemeProvider cuando el gym no define tema.
export const DEFAULT_PRIMARY = "#4A44E4";
export const DEFAULT_ACCENT = "#2DD4BF";

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Registro de un gimnasio (tabla public.gyms). Solo los campos que toca el panel.
export interface Gym {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  logo_url_dark: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  header_logo_size: string | null;
  header_logo_position: string | null;
  header_content: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  default_catalog: boolean | null;
  is_active: boolean | null;
  owner_id: string | null;
  created_at: string | null;
}

export interface GymOwner {
  user_id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface OwnerCandidate {
  id: string;
  user_id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
}

// "Energym Río Cuarto" -> "energym-rio-cuarto"
export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// cacheControl largo: los archivos son inmutables (nombre aleatorio único,
// nunca se reescriben), así el egress sale cacheado por el CDN (el barato).
async function uploadToStorage(file: File, prefix: string): Promise<string> {
  const supabase = getBrowserSupabase();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
  });
  if (error) {
    throw new Error(error.message || "Error al subir el archivo");
  }
  return supabase.storage.from("media").getPublicUrl(path).data
    .publicUrl as string;
}

// Sube una imagen a Supabase Storage (bucket público "media") y devuelve su
// URL pública — es lo que guardan las columnas logo_url/image_uri/etc.; los
// helpers de URL devuelven las URLs http(s) tal cual, así que los consumidores
// no cambian. Se redimensiona/comprime en el browser antes de subir.
export async function uploadImageWeb(file: File): Promise<string> {
  return uploadToStorage(await optimizeImageFile(file), "images");
}

// El browser no puede transcodificar video, así que web acepta el archivo tal
// cual con un tope que fuerza a exportar comprimido (~1-2 min en 720p H.264).
// El bucket tiene su propio tope server-side de 60 MB, más alto a propósito:
// también recibe los videos largos ya comprimidos de mobile.
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

// Sube un video a Supabase Storage (bucket "media", prefijo videos/) y
// devuelve su URL pública. En web no hay sync, así que se sube en el guardado
// del form.
export async function uploadVideoWeb(file: File): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      "El video supera los 25 MB. Exportalo comprimido (720p, H.264) y volvé a subirlo."
    );
  }
  return uploadToStorage(file, "videos");
}

// Etiqueta legible del dueño de un gym.
export function ownerLabel(owner: GymOwner | OwnerCandidate | null): string {
  if (!owner) return "Sin dueño asignado";
  const full = `${owner.name ?? ""} ${owner.last_name ?? ""}`.trim();
  return full || owner.email || "Sin dueño asignado";
}

// Formato de fecha corto en español (idéntico al de los .web.jsx de Expo).
export function formatGymDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    // timeZone fija: el formato debe ser determinístico para que el HTML del
    // server (Node en UTC) y el del cliente (TZ local del browser) coincidan y
    // no haya hydration mismatch en client components SSR-eados (gyms-list).
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  } catch {
    return "—";
  }
}

// Extrae el mensaje de error de una edge function de Supabase (FunctionsHttpError
// trae el cuerpo en error.context, que es una Response).
export async function readFunctionError(
  error: unknown,
  fallback: string
): Promise<string> {
  let msg = fallback;
  const ctx = (error as { context?: { json?: () => Promise<unknown> } })
    ?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      // cuerpo no-JSON: se mantiene el fallback
    }
  } else if (error instanceof Error && error.message) {
    msg = error.message;
  }
  return msg;
}
