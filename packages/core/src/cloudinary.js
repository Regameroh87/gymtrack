export const CLOUD_NAME = "ddupuyeko";

// Los coaches suben video crudo del teléfono (hasta 4K); sin cap de resolución,
// Cloudinary lo sirve casi entero y el bandwidth (créditos) se multiplica sin
// ganancia visual en pantallas de celular. c_limit solo achica, nunca escala hacia arriba.
const VIDEO_TRANSFORMATIONS = "f_auto,q_auto,w_720,c_limit";
const IMAGE_TRANSFORMATIONS = "f_auto,q_auto";

export const getCloudinaryUrl = (publicId, transformations) => {
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
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transformations ?? VIDEO_TRANSFORMATIONS}/${cleanId}`;
  }

  // images/, gymtrack_images/, o cualquier otro public_id → URL de imagen.
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations ?? IMAGE_TRANSFORMATIONS}/${cleanId}`;
};
