export const CLOUD_NAME = "ddupuyeko";

export const getCloudinaryUrl = (
  publicId,
  transformations = "f_auto,q_auto"
) => {
  if (!publicId) return null;

  const cleanId = publicId.startsWith("/") ? publicId.slice(1) : publicId;
  const type = cleanId.startsWith("videos") ? "video" : "image";

  return `https://res.cloudinary.com/${CLOUD_NAME}/${type}/upload/${transformations}/${cleanId}`;
};
