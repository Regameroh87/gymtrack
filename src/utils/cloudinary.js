export const CLOUD_NAME = "ddupuyeko";

export const getCloudinaryUrl = (
  publicId,
  transformations = "f_auto,q_auto"
) => {
  if (!publicId) return null;

  const cleanId = publicId.startsWith("/") ? publicId.slice(1) : publicId;

  // Only return a Cloudinary URL if it has your known prefixes.
  // Otherwise, return null so the component can fallback to the local URI.
  if (cleanId.startsWith("images/")) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${cleanId}`;
  }

  if (cleanId.startsWith("videos/")) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transformations}/${cleanId}`;
  }

  return null;
};
