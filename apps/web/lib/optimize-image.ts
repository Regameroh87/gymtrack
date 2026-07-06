// Optimización de imágenes en el browser antes de subir a Supabase Storage
// para Supabase Storage: Storage no procesa nada server-side, así que
// el resize/compresión ocurre acá con canvas antes de subir.

const MAX_WIDTH = 1600;
const QUALITY = 0.8;

// Redimensiona a MAX_WIDTH y comprime. PNG conserva formato (alpha de logos);
// el resto sale JPEG. Ante cualquier fallo (formato no decodificable, canvas
// bloqueado) devuelve el archivo original: mejor pesado que roto.
export async function optimizeImageFile(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const keepAlpha = file.type === "image/png";
    const type = keepAlpha ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, QUALITY)
    );
    // Sin ganancia real (ya era chica/optimizada) → conservar el original.
    if (!blob || blob.size >= file.size) return file;

    const ext = keepAlpha ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type });
  } catch {
    return file;
  }
}
