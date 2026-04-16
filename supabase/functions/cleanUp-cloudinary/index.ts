// supabase/functions/cleanup-pending-cloudinary/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY")!;
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET")!;

// DEBUG: verificar que los secrets lleguen (borrar después de testear)
console.log("CLOUD_NAME:", CLOUD_NAME ? "✓ cargado" : "✗ VACÍO");
console.log("API_KEY:", API_KEY ? "✓ cargado" : "✗ VACÍO");
console.log("API_SECRET:", API_SECRET ? "✓ cargado" : "✗ VACÍO");

serve(async () => {
  try {
    // 1. Buscar todos los assets con tag "pending_approval"
    //    que tengan más de 24hs (created_at <= now - 24h)
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;

    // Cloudinary Admin API: buscar por tag
    const searchUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/by_tag/pending_approval`;

    const credentials = btoa(`${API_KEY}:${API_SECRET}`);
    const searchResp = await fetch(searchUrl, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    const { resources } = await searchResp.json();

    // 2. Filtrar los que tienen más de 24hs
    const toDelete = resources.filter((r: any) => {
      const createdAt = new Date(r.created_at).getTime() / 1000;
      return createdAt < twentyFourHoursAgo;
    });

    // 3. Eliminar en batch (Cloudinary acepta hasta 100 por request)
    const deleted: string[] = [];
    for (const resource of toDelete) {
      const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/${resource.resource_type}/upload`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_ids: [resource.public_id] }),
      });
      deleted.push(resource.public_id);
    }

    return new Response(
      JSON.stringify({ deleted_count: deleted.length, deleted }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
