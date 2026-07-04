-- Fase 1 de la salida de Cloudinary: bucket público "media" en Supabase Storage
-- para las imágenes de la app (logos, ejercicios, equipamiento, portadas,
-- avatares). Los videos siguen en Cloudinary hasta la Fase 2.
--
-- El bucket es público: las columnas image_uri/logo_url/etc. guardan la URL
-- pública completa (los helpers de URL la devuelven tal cual), y el egress se
-- sirve cacheado por el CDN. Los nombres de archivo son aleatorios, no
-- adivinables, y las imágenes de la app no son datos sensibles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB por imagen
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do nothing;

-- Subida: cualquier usuario autenticado, solo bajo el prefijo images/ (la Fase 2
-- habilitará videos/). No hay policy de UPDATE/DELETE para clientes: el borrado
-- lo hacen las edge functions con service role (bypassa RLS), igual que hoy con
-- la cola cloudinary_delete_queue.
create policy "media_images_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'images'
  );

-- Lectura: el bucket público ya sirve los archivos por URL sin policy; esta
-- habilita además list/download vía API (la usa el sweep de huérfanos del cron).
create policy "media_select_public"
  on storage.objects for select to public
  using (bucket_id = 'media');
