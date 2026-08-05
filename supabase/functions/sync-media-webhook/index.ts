// Ciclo de vida del media. Los triggers de BD "sync-media-assets-*" (gyms,
// exercises_base, sessions, training_plans, equipment, profiles) llaman esta
// función en INSERT/UPDATE/DELETE:
//   - DELETE: borra los assets que referenciaba la fila.
//   - UPDATE: si una columna de media cambió, borra el asset viejo.
//   - INSERT: no hace nada (no hay ciclo pending/confirmed; los huérfanos los
//     barre el cron cleanUp-media).
// Si un borrado falla, se encola en media_delete_queue y el cron lo reintenta.
//
// El media vive en dos lados y la URL guardada dice en cuál: las imágenes en el
// bucket "media" de Supabase Storage, los videos en Cloudflare R2 (ver
// _shared/r2.ts). Quedan además videos viejos con URL de Storage — los subidos
// antes de la mudanza — y se siguen borrando de donde estén: lo que manda es el
// prefijo de la URL, no el tipo de asset.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { isR2Url, r2Delete, r2PathFromUrl } from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Columnas de media vigiladas. Las tablas que no tienen la columna devuelven
// undefined → se saltea. logo_url_dark incluido (gyms tiene logo claro y oscuro).
const ASSET_COLUMNS = [
  "image_uri",
  "video_uri",
  "cover_image_uri",
  "image_profile", // profiles
  "logo_url", // gyms
  "logo_url_dark", // gyms
] as const;

// Las columnas guardan la URL pública completa del bucket "media".
const STORAGE_MARKER = "/storage/v1/object/public/media/";
const isStorageUrl = (uri: string) => uri.includes(STORAGE_MARKER);
const storagePathFromUrl = (url: string) =>
  url.slice(url.indexOf(STORAGE_MARKER) + STORAGE_MARKER.length);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const type = payload.type; // "INSERT" | "UPDATE" | "DELETE"
    const record = payload.record || null;
    const old_record = payload.old_record || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Borra un asset de donde viva; si falla lo encola para reintento por el cron.
    const destroyAsset = async (uri: string) => {
      let path: string;
      let error: Error | null = null;

      if (isR2Url(uri)) {
        path = r2PathFromUrl(uri);
        error = await r2Delete(path).then(
          () => null,
          (err: Error) => err
        );
      } else if (isStorageUrl(uri)) {
        path = storagePathFromUrl(uri);
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove([path]);
        error = storageError ? new Error(storageError.message) : null;
      } else {
        return; // file:// de drafts, YouTube, etc.
      }

      if (error) {
        console.error(`[!] Error al borrar ${path}:`, error.message);
        const resource_type = path.startsWith("videos/") ? "video" : "image";
        const { error: queueError } = await supabase
          .from("media_delete_queue")
          .upsert({ public_id: uri, resource_type }, { onConflict: "public_id" });
        if (queueError) {
          console.error(`[!] Error al encolar ${uri}:`, queueError.message);
        } else {
          console.log(`[Q] ${uri} encolado para reintento por el cron.`);
        }
      } else {
        console.log(`[-] Asset borrado: ${path}`);
      }
    };

    // El media de catálogo (is_catalog=true) tiene un único dueño: la URL vive
    // solo en su fila (los forks custom referencian al catálogo por id, no por
    // URL), así que destruir el asset al borrar/reemplazar no deja colgado a nadie.
    for (const column of ASSET_COLUMNS) {
      if (type === "DELETE" && old_record?.[column]) {
        await destroyAsset(old_record[column]);
      } else if (type === "UPDATE") {
        const newUri = record?.[column];
        const oldUri = old_record?.[column];
        if (oldUri && oldUri !== newUri) {
          await destroyAsset(oldUri);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, action: type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
