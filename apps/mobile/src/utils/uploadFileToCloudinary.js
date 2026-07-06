// React Native
import { Image } from "react-native";

// Librerías externas
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// BD
import { supabase } from "../database/supabase";

// Fase 2 de la salida de Cloudinary: todo el media va a Supabase Storage
// (bucket público "media"). Las imágenes se redimensionan/comprimen y los
// videos se transcodifican a ~720p (react-native-compressor) antes de subir,
// porque Storage no procesa nada del lado del servidor. El public_id devuelto
// es la URL pública completa — los helpers de URL devuelven las URLs http(s)
// tal cual, así que los consumidores no cambian. Se conserva el nombre de la
// función y el contrato { url, public_id } para no tocar a los llamadores
// (sync, perfiles, forms); el param uploadPreset quedó sin uso y se elimina
// junto con el rename del archivo en la Fase 3.

const MAX_IMAGE_WIDTH = 1600;
const IMAGE_QUALITY = 0.8;
// Lado mayor máximo del video comprimido (~720p). El modelo de costos asume
// videos de 10-20 MB; sin esta compresión el egress se multiplica por 6-20.
const MAX_VIDEO_SIZE = 1280;

// Nombre aleatorio no adivinable (el bucket es público): timestamp + random.
const uniqueName = (extension) =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

const getImageSize = (uri) =>
  new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  );

// react-native-compressor es un módulo nativo sin soporte web: se requiere
// lazy para no romper el bundle de Expo web (que sube videos por otro camino).
const getVideoCompressor = () => require("react-native-compressor").Video;

// Sube al bucket con el descriptor de archivo de RN ({ uri, type, name }) en un
// FormData; no seteamos Content-Type a mano para que RN genere el boundary del
// multipart. cacheControl largo: los archivos son inmutables (nombre aleatorio
// único, nunca se reescriben), así el egress sale cacheado por el CDN (el barato).
const uploadToStorage = async ({ uri, path, mime }) => {
  const data = new FormData();
  data.append("file", { uri, type: mime, name: path.split("/").pop() });

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

// Redimensiona a MAX_IMAGE_WIDTH y comprime. PNG conserva formato (alpha de
// logos); el resto sale JPEG (incluye HEIC de iPhone). Si la manipulación
// falla, se sube el original: mejor una imagen pesada que un upload roto.
const prepareImage = async (fileUri, rawExtension) => {
  try {
    const { width } = await getImageSize(fileUri);
    const keepAlpha = rawExtension === "png";

    const context = ImageManipulator.manipulate(fileUri);
    if (width > MAX_IMAGE_WIDTH) {
      context.resize({ width: MAX_IMAGE_WIDTH });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      compress: IMAGE_QUALITY,
      format: keepAlpha ? SaveFormat.PNG : SaveFormat.JPEG,
    });

    return {
      uri: saved.uri,
      extension: keepAlpha ? "png" : "jpg",
      mime: keepAlpha ? "image/png" : "image/jpeg",
    };
  } catch (error) {
    console.warn("[upload] No se pudo optimizar la imagen:", error.message);
    const mimeExtension = rawExtension === "jpg" ? "jpeg" : rawExtension;
    return {
      uri: fileUri,
      extension: rawExtension,
      mime: `image/${mimeExtension}`,
    };
  }
};

const uploadImage = async (fileUri) => {
  const rawExtension = fileUri.split("/").pop().split(".").pop().toLowerCase();
  const image = await prepareImage(fileUri, rawExtension);
  return uploadToStorage({
    uri: image.uri,
    path: `images/${uniqueName(image.extension)}`,
    mime: image.mime,
  });
};

const uploadVideo = async (fileUri) => {
  let uri = fileUri;
  let extension = fileUri.split("/").pop().split(".").pop().toLowerCase();
  let mime = `video/${extension === "mov" ? "quicktime" : extension}`;

  try {
    uri = await getVideoCompressor().compress(fileUri, {
      compressionMethod: "auto",
      maxSize: MAX_VIDEO_SIZE,
    });
    extension = "mp4"; // el compressor siempre emite H.264/mp4
    mime = "video/mp4";
  } catch (error) {
    console.warn("[upload] No se pudo comprimir el video:", error.message);
  }

  return uploadToStorage({
    uri,
    path: `videos/${uniqueName(extension)}`,
    mime,
  });
};

export const uploadFileToCloudinary = async ({ fileUri, typeFile }) => {
  if (typeFile === "image") {
    return uploadImage(fileUri);
  }
  return uploadVideo(fileUri);
};
