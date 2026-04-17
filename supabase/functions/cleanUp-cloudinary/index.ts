// supabase/functions/cleanup-pending-cloudinary/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ATTEMPTS = 5;

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
    // FASE 2: Procesar cola de eliminación (cloudinary_delete_queue)
    // ═══════════════════════════════════════════════════════════════
    console.log("── FASE 2: Procesando cola de eliminación ──");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        const success = await deleteFromCloudinary(item.public_id, item.resource_type, CLOUD_NAME, credentials);

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
