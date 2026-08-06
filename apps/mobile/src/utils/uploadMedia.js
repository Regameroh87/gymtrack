// Librerías externas
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

// BD
import { supabase } from "../database/supabase";

// Sube media y devuelve { url, public_id }: ambos son la URL pública completa,
// que es lo que guardan las columnas de media.
//
// Las imágenes van al bucket público "media" de Supabase Storage; los videos,
// a Cloudflare R2 — el video era el 99% del storage y todo el egress, y R2 no
// cobra egress. Ninguno de los dos procesa nada del lado del servidor, así que
// la optimización es toda client-side: las imágenes se redimensionan/comprimen
// y los videos se transcodifican a ~720p (react-native-compressor).

const MAX_IMAGE_WIDTH = 1600;
const IMAGE_QUALITY = 0.8;
// Lado mayor máximo del video comprimido (~720p). Con R2 el egress ya no se
// paga, pero comprimir sigue mandando: es el tope de 60 MB de la subida, los
// datos móviles del socio que mira el video y el tiempo de carga.
const MAX_VIDEO_SIZE = 1280;

// Nombre aleatorio no adivinable (el bucket es público): timestamp + random.
const uniqueName = (extension) =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

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

// Redimensiona a MAX_IMAGE_WIDTH y comprime a WebP. WebP soporta alpha (transparencia)
// y reduce el peso drásticamente frente a JPEG/PNG. Si la manipulación falla,
// se sube el original: mejor una imagen pesada que un upload roto.
const prepareImage = async (fileUri, rawExtension) => {
  try {
    // El ancho sale del ImageRef y no de Image.getSize: en Android getSize
    // devuelve dp (escalado por densidad) para archivos locales, así que el
    // guard nunca se disparaba y las imágenes subían a resolución completa.
    // El segundo manipulate() reusa el ref ya decodificado, no relee del disco.
    let image = await ImageManipulator.manipulate(fileUri).renderAsync();
    if (image.width > MAX_IMAGE_WIDTH) {
      image = await ImageManipulator.manipulate(image)
        .resize({ width: MAX_IMAGE_WIDTH })
        .renderAsync();
    }
    const saved = await image.saveAsync({
      compress: IMAGE_QUALITY,
      format: SaveFormat.WEBP,
    });

    return {
      uri: saved.uri,
      extension: "webp",
      mime: "image/webp",
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

// Los videos van a R2 con una URL PUT prefirmada: la app no puede tener las
// credenciales del bucket, así que la edge function sign-video-upload valida
// la sesión y devuelve una URL de un solo uso. El archivo sube directo a
// Cloudflare — no pasa por Supabase — y los headers son los que vienen
// firmados: si no se mandan tal cual, R2 responde 403.
const uploadVideoToR2 = async ({ uri, mime }) => {
  // eslint-disable-next-line import/namespace
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("No se encontró el video a subir.");
  }

  const { data, error } = await supabase.functions.invoke("sign-video-upload", {
    body: { content_type: mime, size_bytes: info.size },
  });
  if (error) {
    throw new Error(error.message || "No se pudo preparar la subida del video");
  }

  // eslint-disable-next-line import/namespace
  const res = await FileSystem.uploadAsync(data.upload_url, uri, {
    httpMethod: "PUT",
    // eslint-disable-next-line import/namespace
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: data.headers,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Error al subir el video (HTTP ${res.status})`);
  }

  return { url: data.public_url, public_id: data.public_url, result: data };
};

const uploadVideo = async (fileUri) => {
  let uri = fileUri;
  const extension = fileUri.split("/").pop().split(".").pop().toLowerCase();
  let mime = `video/${extension === "mov" ? "quicktime" : extension}`;

  try {
    uri = await getVideoCompressor().compress(fileUri, {
      compressionMethod: "auto",
      maxSize: MAX_VIDEO_SIZE,
    });
    mime = "video/mp4"; // el compressor siempre emite H.264/mp4
  } catch (error) {
    console.warn("[upload] No se pudo comprimir el video:", error.message);
  }

  return uploadVideoToR2({ uri, mime });
};

export const uploadMedia = async ({ fileUri, typeFile }) => {
  if (typeFile === "image") {
    return uploadImage(fileUri);
  }
  return uploadVideo(fileUri);
};
