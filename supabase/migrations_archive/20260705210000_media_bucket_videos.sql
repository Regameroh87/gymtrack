-- Fase 2 de la salida de Cloudinary: el bucket "media" también recibe videos
-- (prefijo videos/). Mobile los comprime client-side a ~720p H.264 antes de
-- subir; web los acepta tal cual con un límite de 60 MB y aviso al admin.
--
-- El límite de tamaño del bucket es global (no por prefijo), así que pasa de
-- 10 MB a 60 MB como red de seguridad; las imágenes igual llegan chicas porque
-- los clientes las redimensionan antes de subir.
update storage.buckets
set
  file_size_limit = 62914560, -- 60 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
where id = 'media';

-- La policy de insert pasa a aceptar también el prefijo videos/.
drop policy if exists "media_images_insert_authenticated" on storage.objects;
create policy "media_images_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in ('images', 'videos')
  );
