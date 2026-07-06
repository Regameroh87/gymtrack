// Ciclo de vida del media en Supabase Storage. Los triggers de BD
// "sync-media-assets-*" (gyms, exercises_base, sessions, training_plans,
// equipment, profiles) llaman esta función en INSERT/UPDATE/DELETE:
//   - DELETE: borra del bucket los assets que referenciaba la fila.
//   - UPDATE: si una columna de media cambió, borra el asset viejo.
//   - INSERT: no hace nada (no hay ciclo pending/confirmed; los huérfanos los
//     barre el cron cleanUp-media).
// Si un borrado falla, se encola en media_delete_queue y el cron lo reintenta.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Borra un asset del bucket; si falla lo encola para reintento por el cron.
    const destroyAsset = async (uri: string) => {
      if (!isStorageUrl(uri)) return; // file:// de drafts, YouTube, etc.
      const path = storagePathFromUrl(uri);
      const { error } = await supabase.storage.from("media").remove([path]);
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
