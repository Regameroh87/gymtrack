import { CLOUD_NAME } from "@gymtrack/core/cloudinary";
import { supabase } from "../database/supabase";

// Fase 1 de la salida de Cloudinary: las imágenes se suben a Supabase Storage
// (bucket público "media", prefijo images/) y el public_id devuelto es la URL
// pública completa — los helpers de URL (getCloudinaryUrl) devuelven las URLs
// http(s) tal cual, así que los consumidores no cambian. Los videos siguen en
// Cloudinary hasta la Fase 2. Se conserva el nombre de la función y el contrato
// { url, public_id } para no tocar a los llamadores (sync, perfiles, forms).

// Nombre aleatorio no adivinable (el bucket es público): timestamp + random.
const uniqueName = (extension) =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

const uploadImageToStorage = async (fileUri) => {
  const fileName = fileUri.split("/").pop();
  const rawExtension = fileName.split(".").pop().toLowerCase();
  const mimeExtension = rawExtension === "jpg" ? "jpeg" : rawExtension;
  const path = `images/${uniqueName(rawExtension)}`;

  // Igual que con Cloudinary: body FormData con el descriptor de archivo de RN
  // ({ uri, type, name }); no seteamos Content-Type a mano para que RN genere
  // el boundary del multipart.
  const data = new FormData();
  data.append("file", {
    uri: fileUri,
    type: `image/${mimeExtension}`,
    name: fileName,
  });

  // cacheControl largo: los archivos son inmutables (nombre aleatorio único,
  // nunca se reescriben), así el egress sale cacheado por el CDN (el barato).
  const { error } = await supabase.storage
    .from("media")
    .upload(path, data, { cacheControl: "31536000" });
  if (error) {
    throw new Error(error.message || "Error al subir a Supabase Storage");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);

  return { url: publicUrl, public_id: publicUrl, result: { path } };
};

const uploadVideoToCloudinary = async ({ fileUri, uploadPreset }) => {
  const data = new FormData();
  const fileName = fileUri.split("/").pop();
  const extension = fileName.split(".").pop().toLowerCase();

  data.append("file", {
    uri: fileUri,
    type: `video/${extension}`,
    name: fileName,
  });
  data.append("upload_preset", uploadPreset);
  data.append("tags", "pending_approval"); //etiqueta para que el admin pueda filtrar los archivos que estan pendientes de aprobacion
  const URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

  // No seteamos "Content-Type" manualmente: con un body FormData, React Native
  // genera el header con el boundary correcto (multipart/form-data; boundary=...).
  // Forzarlo a mano deja la petición sin boundary y provoca "Network request failed".
  const response = await fetch(URL, {
    method: "POST",
    body: data,
  });

  const result = await response.json();

  if (response.ok) {
    return { url: result.secure_url, public_id: result.public_id, result };
  } else {
    throw new Error(result.error?.message || "Error al subir a Cloudinary"); // Deberia hacer un rollback de la transaccion
  }
};

export const uploadFileToCloudinary = async ({
  fileUri,
  uploadPreset,
  typeFile,
}) => {
  if (typeFile === "image") {
    return uploadImageToStorage(fileUri);
  }
  return uploadVideoToCloudinary({ fileUri, uploadPreset });
};
