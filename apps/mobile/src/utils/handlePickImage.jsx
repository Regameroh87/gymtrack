/**
 * handlePickImage
 *
 * Flujo offline-first:
 *  1. Abre el picker (galería o cámara) y persiste el archivo localmente.
 *  2. Llama a `onChange` con la URI local persistente de inmediato.
 *  3. NO sube a Cloudinary aquí — eso lo hace el job de sincronización
 *     cuando detecta registros con sync_status = 'pending'.
 */
export default async function handlePickImage({
  onChange,
  pickMedia,
  source = "gallery",
}) {
  const file = await pickMedia({ source });

  if (!file) return; // El usuario canceló o denegó el permiso

  // Notificamos al formulario con la URI local persistida
  onChange(file.uri);
}
