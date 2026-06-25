// Los logos de gym se guardan como public_id crudo de Cloudinary (ver memoria
// del proyecto: image_uri/video_uri son public_id; se construye la URL con el
// CLOUD_NAME si no traen prefijo de carpeta tipo "images/"). Si ya viene una URL
// completa, se devuelve tal cual.

export const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "ddupuyeko";

export function cloudinaryUrl(
  publicId: string | null | undefined,
  transformations?: string
): string | null {
  if (!publicId) return null;
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  const t = transformations ? `${transformations}/` : "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t}${publicId}`;
}

// Variante para videos (Cloudinary los sirve por /video/upload). El video_uri es el
// public_id crudo devuelto por uploadVideoWeb. Ver [[project_cloudinary_public_id]].
export function cloudinaryVideoUrl(
  publicId: string | null | undefined
): string | null {
  if (!publicId) return null;
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${publicId}`;
}
