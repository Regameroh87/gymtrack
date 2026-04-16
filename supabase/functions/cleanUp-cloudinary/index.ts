// supabase/functions/cleanup-pending-cloudinary/index.ts
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
    const headers = { Authorization: `Basic ${credentials}` };

    console.log("Buscando assets con tag pending_approval...");
    
    // Cloudinary separa los assets en image y video en la API REST
    // Por defecto devuelve 10, agregamos max_results=500 para traer todos.
    const urlImages = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/tags/pending_approval?max_results=500`;
    const urlVideos = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/tags/pending_approval?max_results=500`;

    const [respImages, respVideos] = await Promise.all([
      fetch(urlImages, { headers }),
      fetch(urlVideos, { headers })
    ]);

    let resources: any[] = [];

    // Validar y parsear imágenes
    if (respImages.ok) {
      const dataImg = await respImages.json();
      if (dataImg.resources) resources = resources.concat(dataImg.resources);
    } else {
      console.log("Error buscando imágenes:", await respImages.text());
    }

    // Validar y parsear videos
    if (respVideos.ok) {
      const dataVid = await respVideos.json();
      if (dataVid.resources) resources = resources.concat(dataVid.resources);
    } else {
      console.log("Error buscando videos:", await respVideos.text());
    }

    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 86400;

    const toDelete = resources.filter((r: any) => {
      const createdAt = new Date(r.created_at).getTime() / 1000;
      return createdAt < twentyFourHoursAgo;
    });

    console.log(`Encontrados: ${resources.length}, A borrar: ${toDelete.length}`);

    const deleted: string[] = [];
    for (const resource of toDelete) {
      // Enviar el public_id por URL resuelve el problema de los DELETEs con body,
      // que a veces son ignorados o mal procesados.
      const queryParams = new URLSearchParams([
        ["public_ids[]", resource.public_id]
      ]).toString();

      const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/${resource.resource_type}/upload?${queryParams}`;
      
      const delResponse = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      const delData = await delResponse.json();
      console.log(`Borrado ${resource.public_id}:`, delData);

      // Cloudinary responde con { deleted: { "public_id": "deleted" } } o "not_found"
      if (delData.deleted && delData.deleted[resource.public_id] === "deleted") {
        deleted.push(resource.public_id);
      } else {
        console.warn(`Respuesta inesperada al borrar ${resource.public_id}:`, delData);
      }
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
