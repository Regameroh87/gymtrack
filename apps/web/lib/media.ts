// URL servible a partir de lo guardado en las columnas de media de la BD
// (logo_url / image_uri / video_uri / cover_image_uri / image_profile):
// una URL http(s) completa (Supabase Storage, YouTube) se devuelve tal cual;
// cualquier otro valor (ej. file:// de un draft mobile) no es servible → null.
export function mediaUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  return null;
}
