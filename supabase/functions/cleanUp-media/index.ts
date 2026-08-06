// Limpieza diaria del media (cron "cleanup-media", 6:00).
//   FASE 1: barre huérfanos (archivos > 24hs sin referencia en la BD) — cubre
//           subidas cuyo formulario nunca llegó a crear la fila. Las imágenes
//           se barren en el bucket "media" de Supabase Storage; los videos, en
//           Cloudflare R2.
//   FASE 2: procesa media_delete_queue, la cola de reintentos que alimentan
//           sync-media-webhook, delete_gym_cascade y eliminar-socio.
//
// ── Por qué el barrido de Storage ya no mira videos/ ─────────────────────────
// Los videos se mudaron a R2 y las columnas video_uri apuntan allá, así que los
// ~150 videos que quedaron en Storage no los referencia nadie: si este barrido
// siguiera mirando el prefijo videos/ del bucket, los borraría a todos en la
// primera corrida posterior a la mudanza. No es lo que queremos — tienen que
// sobrevivir hasta que los bundles viejos de Expo terminen de re-sincronizar,
// y recién ahí se borran en una tanda explícita y aparte. Sacar videos/ de acá
// es lo que garantiza que ningún proceso automático los toque.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  isR2Url,
  r2Delete,
  r2IsConfigured,
  r2List,
  r2PathFromUrl,
  r2PublicUrl,
} from "../_shared/r2.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 5;

// Las columnas de imagen guardan la URL pública completa del bucket "media".
const STORAGE_MARKER = "/storage/v1/object/public/media/";
const isStorageUrl = (uri: string) => uri.includes(STORAGE_MARKER);
const storagePathFromUrl = (url: string) =>
  url.slice(url.indexOf(STORAGE_MARKER) + STORAGE_MARKER.length);

// Columnas de imagen (mismas que delete_gym_cascade + sync-media-webhook).
const IMAGE_REFS: Array<[table: string, column: string]> = [
  ["gyms", "logo_url"],
  ["gyms", "logo_url_dark"],
  ["exercises_base", "image_uri"],
  ["sessions", "cover_image_uri"],
  ["training_plans", "cover_image_uri"],
  ["equipment", "image_uri"],
  ["profiles", "image_profile"],
  ["custom_exercises", "image_uri"],
  ["custom_sessions", "cover_image_uri"],
  ["custom_plans", "cover_image_uri"],
];

// Columnas de video. Solo estas dos: un video huérfano en R2 no puede estar
// referenciado desde una columna de imagen.
const VIDEO_REFS: Array<[table: string, column: string]> = [
  ["exercises_base", "video_uri"],
  ["custom_exercises", "video_uri"],
];

const DAY_MS = 86400 * 1000;

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Devuelve el subconjunto de candidateUrls que sigue referenciado en la BD.
    // Si alguna consulta falla devuelve null: nunca borrar sin certeza.
    const referencedUrls = async (
      refs: Array<[string, string]>,
      candidateUrls: string[]
    ): Promise<Set<string> | null> => {
      const referenced = new Set<string>();
      for (const [table, column] of refs) {
        const { data, error } = await supabase
          .from(table)
          .select(column)
          .in(column, candidateUrls);
        if (error) {
          console.error(`Error consultando ${table}.${column}:`, error.message);
          return null;
        }
        for (const row of data ?? []) {
          // select() con una columna dinámica no le deja inferir la fila a
          // supabase-js (el tipo que sale incluye GenericStringError), así que
          // el cast pasa por unknown. Lo que llega siempre es { [column]: ... }.
          const value = (row as unknown as Record<string, string | null>)[column];
          if (value) referenced.add(value);
        }
      }
      return referenced;
    };

    // ═══════════════════════════════════════════════════════════════
    // FASE 1a: Huérfanos de imagen en Supabase Storage
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 1a: Huérfanos de imagen en Storage ──");

    const deletedImages: string[] = [];
    const dayAgoMs = Date.now() - DAY_MS;

    const { data: imageFiles, error: listImagesError } = await supabase.storage
      .from("media")
      .list("images", { limit: 500 });

    if (listImagesError) {
      console.error("Error listando media/images:", listImagesError.message);
    } else {
      const oldFiles = (imageFiles ?? []).filter(
        (f) => f.created_at && new Date(f.created_at).getTime() < dayAgoMs
      );

      if (oldFiles.length > 0) {
        const urlFor = (name: string) =>
          `${SUPABASE_URL}${STORAGE_MARKER}images/${name}`;
        const referenced = await referencedUrls(
          IMAGE_REFS,
          oldFiles.map((f) => urlFor(f.name))
        );

        if (referenced) {
          const orphanPaths = oldFiles
            .filter((f) => !referenced.has(urlFor(f.name)))
            .map((f) => `images/${f.name}`);

          if (orphanPaths.length > 0) {
            const { error: removeError } = await supabase.storage
              .from("media")
              .remove(orphanPaths);
            if (removeError) {
              console.error("Error borrando huérfanos:", removeError.message);
            } else {
              deletedImages.push(...orphanPaths);
            }
          }
        }
      }
    }
    console.log(`Imágenes huérfanas borradas: ${deletedImages.length}`);

    // ═══════════════════════════════════════════════════════════════
    // FASE 1b: Huérfanos de video en R2
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 1b: Huérfanos de video en R2 ──");

    const deletedVideos: string[] = [];

    if (!r2IsConfigured()) {
      // Sin credenciales no se barre, pero el resto del job tiene que correr:
      // un R2 mal configurado no puede frenar la cola ni el barrido de imágenes.
      console.error("R2 sin configurar: se saltea el barrido de video.");
    } else {
      try {
        const objects = await r2List("videos/");
        const oldObjects = objects.filter(
          (o) => o.lastModified.getTime() < dayAgoMs
        );

        if (oldObjects.length > 0) {
          const referenced = await referencedUrls(
            VIDEO_REFS,
            oldObjects.map((o) => r2PublicUrl(o.key))
          );

          if (referenced) {
            for (const object of oldObjects) {
              if (referenced.has(r2PublicUrl(object.key))) continue;
              try {
                await r2Delete(object.key);
                deletedVideos.push(object.key);
              } catch (err) {
                console.error(
                  `Error borrando ${object.key}:`,
                  (err as Error).message
                );
              }
            }
          }
        }
      } catch (err) {
        console.error("Error listando R2:", (err as Error).message);
      }
    }
    console.log(`Videos huérfanos borrados: ${deletedVideos.length}`);

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

      if (isR2Url(item.public_id)) {
        success = await r2Delete(r2PathFromUrl(item.public_id)).then(
          () => true,
          (err: Error) => {
            console.error(`Error al borrar ${item.public_id}:`, err.message);
            return false;
          }
        );
      } else if (isStorageUrl(item.public_id)) {
        const path = storagePathFromUrl(item.public_id);
        const { error } = await supabase.storage.from("media").remove([path]);
        // remove() no falla si el objeto no existe: mismo criterio que "ya borrado".
        success = !error;
        if (error) console.error(`Error al borrar ${path}:`, error.message);
      } else {
        // Valor que no es una URL de media (file:// de un draft, resto legacy):
        // no hay nada que borrar → se descarta de la cola.
        console.warn(`Descartando item no-media de la cola: ${item.public_id}`);
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
      storage_orphans: {
        deleted_count: deletedImages.length,
        deleted: deletedImages,
      },
      r2_orphans: {
        deleted_count: deletedVideos.length,
        deleted: deletedVideos,
      },
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
    const message = (err as Error).message;
    console.error("Error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
