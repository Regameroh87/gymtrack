// Optimización de imágenes en el browser antes de subir a Supabase Storage:
// el resize/compresión y conversión a WebP ocurre acá con canvas antes de subir.
// WebP soporta canal alfa (transparencia) y reduce el peso un 30-70% frente a JPEG/PNG.

const MAX_WIDTH = 1600;
const QUALITY = 0.8;

// Redimensiona a MAX_WIDTH y comprime a WebP. Ante cualquier fallo (formato no decodificable,
// canvas bloqueado) devuelve el archivo original: mejor pesado que roto.
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
    bitmap.close(); // ya está pintado en el canvas: liberar el bitmap decodificado.

    const type = "image/webp";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, QUALITY)
    );
    // blob.type !== type: si el browser no encodea WebP, toBlob cae a PNG por
    // spec; etiquetarlo igual subiría un PNG servido como WebP.
    // blob.size >= file.size: sin ganancia real (ya era chica/optimizada).
    if (!blob || blob.type !== type || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type });
  } catch {
    return file;
  }
}

