-- El bucket "media" vuelve a ser solo de imágenes.
--
-- Último paso de la mudanza a R2. Los videos se subían acá bajo el prefijo
-- videos/ y ya no: los sube sign-video-upload contra R2. El bucket seguía
-- aceptándolos solo para no romper los bundles viejos de Expo mientras
-- circulaban, y eso ya no aplica.
--
-- DEPENDE del deploy previo (edge functions + web + OTA de Expo) y de haber
-- corrido scripts/delete-storage-video-originals.mjs: si quedaran objetos bajo
-- videos/, esta migración no los toca — solo corta las subidas nuevas.

-- INSERT vuelve a images/ únicamente (era el estado de la Fase 1, antes de que
-- videos/ entrara con la Fase 2).
drop policy if exists "media_images_insert_authenticated" on storage.objects;
create policy "media_images_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'images'
  );

-- El tope había subido a 60 MB para los videos comprimidos de mobile. Sin
-- videos, vuelve a 10 MB, que es de sobra para imágenes que los clientes ya
-- redimensionan a 1600px antes de subir. Los mime types de video salen: que el
-- bucket los siga aceptando es una invitación a que alguien vuelva a cablear
-- una subida de video acá sin saber por qué se había dejado de hacer.
update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB por imagen
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic',
    'image/heif'
  ]
where id = 'media';
