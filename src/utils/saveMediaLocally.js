import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";

/**
 * Toma una URI temporal de la galería o cámara y la guarda de forma permanente
 * en la memoria segura de la aplicación (documentDirectory).
 *
 * @param {string} tempUri - La ruta temporal del archivo (`videoFile.uri` o `result.uri`)
 * @param {string} defaultExt - La extensión por defecto si no se puede extraer (ej. "mp4", "jpg")
 * @returns {Promise<{uri: string, size: string | null, ext: string}>} - Información de la nueva foto/video
 */
export async function saveMediaLocally(tempUri, defaultExt = "jpg") {
  const ext = tempUri.split(".").pop() || defaultExt;
  const fileName = `${Crypto.randomUUID()}.${ext}`;

  // eslint-disable-next-line import/namespace
  const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

  // eslint-disable-next-line import/namespace
  await FileSystem.copyAsync({ from: tempUri, to: permanentUri });

  // eslint-disable-next-line import/namespace
  const info = await FileSystem.getInfoAsync(permanentUri);

  return {
    uri: permanentUri,
    size: info.exists ? (info.size / 1024 / 1024).toFixed(2) : null,
    ext,
  };
}
