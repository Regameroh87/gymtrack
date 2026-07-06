// supabase/functions/cleanup-pending-cloudinary/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 5;

// Fase 1 salida de Cloudinary: las imágenes viven en Supabase Storage (bucket
// público "media") y las columnas guardan su URL pública. La cola de
// eliminación puede contener tanto public_ids de Cloudinary como estas URLs.
const STORAGE_MARKER = "/storage/v1/object/public/media/";
const isStorageUrl = (id: string) => id.includes(STORAGE_MARKER);
const storagePathFromUrl = (url: string) =>
  url.slice(url.indexOf(STORAGE_MARKER) + STORAGE_MARKER.length);

// Tablas/columnas que referencian media (mismas que delete_gym_cascade +
// sync-cloudinary-webhook). Las usa el sweep de huérfanos de Storage.
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

// Prefijos del bucket que barre el sweep de huérfanos (Fase 2: también videos/).
const STORAGE_PREFIXES = ["images", "videos"];

serve(async () => {
  try {
    console.log("CLOUD_NAME:", CLOUD_NAME ? "✓" : "✗ VACÍO");
    console.log("API_KEY:", API_KEY ? "✓" : "✗ VACÍO");
    console.log("API_SECRET:", API_SECRET ? "✓" : "✗ VACÍO");

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return new Response(
        JSON.stringify({ error: "Faltan variables de entorno de Cloudinary" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(`${API_KEY}:${API_SECRET}`);
    const headers = { Authorization: `Basic ${credentials}` };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ═══════════════════════════════════════════════════════════════
    // FASE 1: Limpiar assets con tag "pending_approval" > 24hs
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 1: Limpieza de pending_approval ──");

    const endpoints = [
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/tags/pending_approval?max_results=500`,
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/tags/pending_approval?max_results=500`
    ];

    const combinedResults = await Promise.all(
      endpoints.map(async (url) => {
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          console.warn(`Error buscando assets en: ${url.includes('/image/') ? 'image' : 'video'}`, await resp.text());
          return [];
        }
        const data = await resp.json();
        return data.resources || [];
      })
    );

    const resources = combinedResults.flat();
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;

    const toDelete = resources.filter((r: any) => {
      const createdAt = new Date(r.created_at).getTime() / 1000;
      return createdAt < twentyFourHoursAgo;
    });

    console.log(`Pending: encontrados ${resources.length}, a borrar: ${toDelete.length}`);

    const deletedPending: string[] = [];
    for (const resource of toDelete) {
      const success = await deleteFromCloudinary(resource.public_id, resource.resource_type, CLOUD_NAME, credentials);
      if (success) {
        deletedPending.push(resource.public_id);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 1.5: Huérfanos en Supabase Storage (media/images y media/videos
    // > 24hs sin referencia en la BD). Equivalente del pending_approval de
    // Cloudinary: cubre subidas cuyo formulario nunca llegó a crear la fila.
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 1.5: Huérfanos en Supabase Storage ──");

    const deletedOrphans: string[] = [];
    const dayAgoMs = Date.now() - 86400 * 1000;

    // Archivos viejos de todos los prefijos, con su path completo en el bucket.
    const oldPaths: string[] = [];
    let listFailed = false;
    for (const prefix of STORAGE_PREFIXES) {
      const { data: storageFiles, error: listError } = await supabase.storage
        .from("media")
        .list(prefix, { limit: 500 });
      if (listError) {
        console.error(`Error listando media/${prefix}:`, listError.message);
        listFailed = true;
        break;
      }
      for (const f of storageFiles ?? []) {
        if (f.created_at && new Date(f.created_at).getTime() < dayAgoMs) {
          oldPaths.push(`${prefix}/${f.name}`);
        }
      }
    }

    if (!listFailed && oldPaths.length > 0) {
      const urlFor = (path: string) => `${SUPABASE_URL}${STORAGE_MARKER}${path}`;
      const candidateUrls = oldPaths.map(urlFor);

      // URLs referenciadas por alguna columna de media. Si una consulta
      // falla se aborta el sweep entero: nunca borrar sin certeza.
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

      if (!sweepFailed) {
        const orphanPaths = oldPaths.filter((p) => !referenced.has(urlFor(p)));

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
    }
    console.log(
      `Storage: ${oldPaths.length} archivos >24hs, huérfanos borrados: ${deletedOrphans.length}`
    );

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: Procesar cola de eliminación (cloudinary_delete_queue)
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 2: Procesando cola de eliminación ──");

    const { data: queueItems, error: queueError } = await supabase
      .from("cloudinary_delete_queue")
      .select("*")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true });

    if (queueError) {
      console.error("Error leyendo la cola:", queueError);
    }

    const deletedFromQueue: string[] = [];
    const failedFromQueue: string[] = [];

    if (queueItems && queueItems.length > 0) {
      console.log(`Cola: ${queueItems.length} items pendientes`);

      for (const item of queueItems) {
        // La cola mezcla public_ids de Cloudinary y URLs de Supabase Storage
        // (delete_gym_cascade y el webhook encolan el valor de la columna tal cual).
        const success = isStorageUrl(item.public_id)
          ? await deleteFromStorage(supabase, item.public_id)
          : await deleteFromCloudinary(item.public_id, item.resource_type, CLOUD_NAME, credentials);

        if (success) {
          // Eliminación exitosa → quitar de la cola
          await supabase
            .from("cloudinary_delete_queue")
            .delete()
            .eq("id", item.id);
          deletedFromQueue.push(item.public_id);
        } else {
          // Falló → incrementar intentos
          const newAttempts = item.attempts + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            // Demasiados intentos → eliminar de la cola y loguear
            console.warn(`Descartando ${item.public_id} después de ${MAX_ATTEMPTS} intentos fallidos`);
            await supabase
              .from("cloudinary_delete_queue")
              .delete()
              .eq("id", item.id);
          } else {
            await supabase
              .from("cloudinary_delete_queue")
              .update({ attempts: newAttempts, last_attempted_at: new Date().toISOString() })
              .eq("id", item.id);
          }
          failedFromQueue.push(item.public_id);
        }
      }
    } else {
      console.log("Cola vacía, nada que procesar.");
    }

    const summary = {
      pending_cleanup: { deleted_count: deletedPending.length, deleted: deletedPending },
      storage_orphans: { deleted_count: deletedOrphans.length, deleted: deletedOrphans },
      queue_cleanup: { deleted_count: deletedFromQueue.length, deleted: deletedFromQueue, failed: failedFromQueue },
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

/**
 * Borra un asset de Supabase Storage (bucket "media") a partir de su URL pública.
 * Retorna true si fue borrado o si ya no existía.
 */
async function deleteFromStorage(supabase: any, publicUrl: string): Promise<boolean> {
  const path = storagePathFromUrl(publicUrl);
  const { error } = await supabase.storage.from("media").remove([path]);
  if (error) {
    console.error(`Error al borrar de Storage ${path}:`, error.message);
    return false;
  }
  // remove() no falla si el objeto no existe: mismo criterio que not_found.
  console.log(`Borrado de Storage: ${path}`);
  return true;
}

/**
 * Intenta borrar un asset de Cloudinary.
 * Retorna true si fue borrado exitosamente o si no existía (not_found).
 */
async function deleteFromCloudinary(
  publicId: string,
  resourceType: string,
  cloudName: string,
  credentials: string
): Promise<boolean> {
  try {
    const queryParams = new URLSearchParams([
      ["public_ids[]", publicId]
    ]).toString();

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload?${queryParams}`;

    const delResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Basic ${credentials}` },
    });

    const delData = await delResponse.json();
    console.log(`Borrado ${publicId}:`, delData);

    // "deleted" o "not_found" ambos son OK (el asset ya no existe en Cloudinary)
    if (delData.deleted && (delData.deleted[publicId] === "deleted" || delData.deleted[publicId] === "not_found")) {
      return true;
    }

    console.warn(`Respuesta inesperada al borrar ${publicId}:`, delData);
    return false;
  } catch (err) {
    console.error(`Error al borrar ${publicId}:`, err.message);
    return false;
  }
}
