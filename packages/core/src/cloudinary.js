export const CLOUD_NAME = "ddupuyeko";

export const getCloudinaryUrl = (
  publicId,
  transformations = "f_auto,q_auto"
) => {
  if (!publicId) return null;

  // Local file URIs (offline-first mobile) are not Cloudinary assets.
  if (publicId.startsWith("file://") || publicId.startsWith("content://")) {
    return null;
  }

  // URLs completas (Supabase Storage — Fase 1 de la salida de Cloudinary) se
  // devuelven tal cual: las transformaciones solo aplican a public_ids de
  // Cloudinary; las imágenes de Storage se suben ya en su tamaño final.
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }

  const cleanId = publicId.startsWith("/") ? publicId.slice(1) : publicId;

  if (cleanId.startsWith("videos/")) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transformations}/${cleanId}`;
  }

  // images/, gymtrack_images/, o cualquier otro public_id → URL de imagen.
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${cleanId}`;
};
