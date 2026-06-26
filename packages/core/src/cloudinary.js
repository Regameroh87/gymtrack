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

  const cleanId = publicId.startsWith("/") ? publicId.slice(1) : publicId;

  if (cleanId.startsWith("videos/")) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transformations}/${cleanId}`;
  }

  // images/, gymtrack_images/, o cualquier otro public_id → URL de imagen.
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${cleanId}`;
};
