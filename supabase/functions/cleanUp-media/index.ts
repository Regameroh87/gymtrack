// Limpieza diaria del media en Supabase Storage (cron "cleanup-media", 6:00).
//   FASE 1: barre huérfanos del bucket (archivos > 24hs sin referencia en la
//           BD) — cubre subidas cuyo formulario nunca llegó a crear la fila.
//   FASE 2: procesa media_delete_queue, la cola de reintentos que alimentan
//           sync-media-webhook, delete_gym_cascade y eliminar-socio.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 5;

// Las columnas guardan la URL pública completa del bucket "media".
const STORAGE_MARKER = "/storage/v1/object/public/media/";
const isStorageUrl = (uri: string) => uri.includes(STORAGE_MARKER);
const storagePathFromUrl = (url: string) =>
  url.slice(url.indexOf(STORAGE_MARKER) + STORAGE_MARKER.length);

// Tablas/columnas que referencian media (mismas que delete_gym_cascade +
// sync-media-webhook). Las usa el sweep de huérfanos.
const MEDIA_REFS: Array<[table: string, column: string]> = [
  ["gyms", "logo_url"],
  ["gyms", "logo_url_dark"],
  ["exercises_base", "image_uri"],
  ["exercises_base", "video_uri"],
  ["sessions", "cover_image_uri"],
  ["training_plans", "cover_image_uri"],
  ["equipment", "image_uri"],
  ["profiles", "image_profile"],
  ["custom_exercises", "image_uri"],
  ["custom_exercises", "video_uri"],
  ["custom_sessions", "cover_image_uri"],
  ["custom_plans", "cover_image_uri"],
];

// Prefijos del bucket donde suben los clientes (policy de INSERT).
const PREFIXES = ["images", "videos"];

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ═══════════════════════════════════════════════════════════════
    // FASE 1: Huérfanos en el bucket (> 24hs sin referencia en la BD)
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 1: Huérfanos en Storage ──");

    const deletedOrphans: string[] = [];
    const dayAgoMs = Date.now() - 86400 * 1000;

    for (const prefix of PREFIXES) {
      const { data: files, error: listError } = await supabase.storage
        .from("media")
        .list(prefix, { limit: 500 });

      if (listError) {
        console.error(`Error listando media/${prefix}:`, listError.message);
        continue;
      }

      const oldFiles = (files ?? []).filter(
        (f) => f.created_at && new Date(f.created_at).getTime() < dayAgoMs
      );
      if (oldFiles.length === 0) continue;

      const urlFor = (name: string) =>
        `${SUPABASE_URL}${STORAGE_MARKER}${prefix}/${name}`;
      const candidateUrls = oldFiles.map((f) => urlFor(f.name));

      // URLs referenciadas por alguna columna de media. Si una consulta falla
      // se aborta el sweep del prefijo entero: nunca borrar sin certeza.
      const referenced = new Set<string>();
      let sweepFailed = false;
      for (const [table, column] of MEDIA_REFS) {
        const { data, error } = await supabase
          .from(table)
          .select(column)
          .in(column, candidateUrls);
        if (error) {
          console.error(`Error consultando ${table}.${column}:`, error.message);
          sweepFailed = true;
          break;
        }
        for (const row of data ?? []) {
          const value = (row as Record<string, string | null>)[column];
          if (value) referenced.add(value);
        }
      }
      if (sweepFailed) continue;

      const orphanPaths = oldFiles
        .filter((f) => !referenced.has(urlFor(f.name)))
        .map((f) => `${prefix}/${f.name}`);

      if (orphanPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("media")
          .remove(orphanPaths);
        if (removeError) {
          console.error("Error borrando huérfanos:", removeError.message);
        } else {
          deletedOrphans.push(...orphanPaths);
        }
      }
    }
    console.log(`Huérfanos borrados: ${deletedOrphans.length}`);

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: Procesar cola de eliminación (media_delete_queue)
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 2: Procesando cola de eliminación ──");

    const { data: queueItems, error: queueError } = await supabase
      .from("media_delete_queue")
      .select("*")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true });

    if (queueError) {
      console.error("Error leyendo la cola:", queueError);
    }

    const deletedFromQueue: string[] = [];
    const failedFromQueue: string[] = [];

    for (const item of queueItems ?? []) {
      let success: boolean;
      if (isStorageUrl(item.public_id)) {
        const path = storagePathFromUrl(item.public_id);
        const { error } = await supabase.storage.from("media").remove([path]);
        // remove() no falla si el objeto no existe: mismo criterio que "ya borrado".
        success = !error;
        if (error) console.error(`Error al borrar ${path}:`, error.message);
      } else {
        // Valor que no es una URL del bucket (file:// de un draft, resto legacy):
        // no hay nada que borrar en Storage → se descarta de la cola.
        console.warn(`Descartando item no-Storage de la cola: ${item.public_id}`);
        success = true;
      }

      if (success) {
        await supabase.from("media_delete_queue").delete().eq("id", item.id);
        deletedFromQueue.push(item.public_id);
      } else {
        const newAttempts = item.attempts + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
          console.warn(
            `Descartando ${item.public_id} después de ${MAX_ATTEMPTS} intentos fallidos`
          );
          await supabase.from("media_delete_queue").delete().eq("id", item.id);
        } else {
          await supabase
            .from("media_delete_queue")
            .update({
              attempts: newAttempts,
              last_attempted_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        }
        failedFromQueue.push(item.public_id);
      }
    }

    const summary = {
      storage_orphans: { deleted_count: deletedOrphans.length, deleted: deletedOrphans },
      queue_cleanup: {
        deleted_count: deletedFromQueue.length,
        deleted: deletedFromQueue,
        failed: failedFromQueue,
      },
    };

    console.log("Resumen:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
