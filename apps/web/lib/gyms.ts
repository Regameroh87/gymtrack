// Helpers compartidos del CRUD de gimnasios (panel de plataforma del super_admin).
// Portados de apps/mobile platform/gyms/_form.jsx + hooks de @gymtrack/core/hooks/gyms.
// En web no hay TanStack Query/Form ni react-native: las mutaciones usan el cliente
// browser de Supabase y la subida a Cloudinary se hace con fetch directo.

// Config
const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "ddupuyeko";

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

// Sube una imagen a Cloudinary (preset de imágenes pendientes de aprobación) y
// devuelve su public_id (lo que guarda la columna logo_url).
export async function uploadImageWeb(file: File): Promise<string> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "gymtrack_images");
  data.append("tags", "pending_approval");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: data }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Error al subir imagen");
  }
  return json.public_id as string;
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
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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
