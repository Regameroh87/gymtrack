-- Reescribe video_uri de Supabase Storage a Cloudflare R2.
--
-- DEPENDE DEL DEPLOY PREVIO del código que lee R2 (edge functions + web + el
-- update de Expo) y de haber corrido scripts/migrate-videos-to-r2.mjs
-- --execute con los videos ya verificados en el bucket. Las rutas se
-- preservan, así que la reescritura es un cambio de prefijo y nada más.
--
-- Aplicada con 162 videos copiados y verificados (tamaño + MD5) en R2, y los
-- 162 originales intactos en Storage.
--
-- El trigger va desactivado a propósito: sync-media-assets-exercises llama a
-- sync-media-webhook en cada UPDATE, y esa función borra el asset viejo cuando
-- la columna de media cambia. Con el trigger activo, este update borraría los
-- originales de Storage justo cuando todavía son la única red de seguridad.
-- Los originales NO se borran acá; eso es una tanda posterior, cuando ya no
-- queden bundles de Expo con las URLs viejas en su SQLite.
--
-- custom_exercises no tiene trigger de media (solo el de updated_at), por eso
-- se reescribe sin desactivar nada.
begin;

alter table public.exercises_base disable trigger "sync-media-assets-exercises";

update public.exercises_base
   set video_uri = replace(
         video_uri,
         'https://claoplxdhdxoixfdsatz.supabase.co/storage/v1/object/public/media/videos/',
         'https://media.gymtrack.ar/videos/'
       )
 where video_uri like 'https://claoplxdhdxoixfdsatz.supabase.co/storage/v1/object/public/media/videos/%';

update public.custom_exercises
   set video_uri = replace(
         video_uri,
         'https://claoplxdhdxoixfdsatz.supabase.co/storage/v1/object/public/media/videos/',
         'https://media.gymtrack.ar/videos/'
       )
 where video_uri like 'https://claoplxdhdxoixfdsatz.supabase.co/storage/v1/object/public/media/videos/%';

alter table public.exercises_base enable trigger "sync-media-assets-exercises";

-- Red de seguridad: si quedó alguna URL de video apuntando a Storage, algo
-- salió mal y la transacción no se confirma.
do $$
declare
  restantes int;
begin
  select count(*) into restantes
    from (
      select video_uri from public.exercises_base
      union all
      select video_uri from public.custom_exercises
    ) v
   where v.video_uri like 'https://claoplxdhdxoixfdsatz.supabase.co/storage/v1/object/public/media/videos/%';

  if restantes > 0 then
    raise exception 'Quedaron % video_uri apuntando a Storage', restantes;
  end if;
end $$;

commit;
