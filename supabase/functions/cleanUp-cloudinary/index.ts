// supabase/functions/cleanup-pending-cloudinary/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

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
    const searchUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/by_tag/pending_approval`;

    console.log("Buscando assets con tag pending_approval...");
    const searchResp = await fetch(searchUrl, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    const searchData = await searchResp.json();
    console.log("Respuesta Cloudinary:", JSON.stringify(searchData));

    if (!searchResp.ok) {
      return new Response(
        JSON.stringify({ error: "Error de Cloudinary", details: searchData }),
        { status: searchResp.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const resources = searchData.resources || [];
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;

    const toDelete = resources.filter((r: any) => {
      const createdAt = new Date(r.created_at).getTime() / 1000;
      return createdAt < twentyFourHoursAgo;
    });

    console.log(`Encontrados: ${resources.length}, A borrar: ${toDelete.length}`);

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
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
