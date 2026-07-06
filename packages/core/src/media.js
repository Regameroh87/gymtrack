// URL servible a partir de lo guardado en las columnas de media de la BD
// (image_uri / video_uri / logo_url / image_profile / cover_image_uri):
//   - URL http(s) completa (Supabase Storage, YouTube) → se devuelve tal cual.
//   - file:// o content:// (offline-first mobile, aún sin subir) → null; el
//     consumidor decide si muestra la URI local o un placeholder.
//   - Cualquier otro valor → null (no queda ningún formato legacy en la BD).
export const getMediaUrl = (uri) => {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  return null;
};
