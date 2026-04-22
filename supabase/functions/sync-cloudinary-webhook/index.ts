import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps each Cloudinary column to its resource_type for the API
const ASSET_FIELDS = [
  { column: "image_uri", resource_type: "image" },
  { column: "video_uri", resource_type: "video" },
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") { return new Response("ok", { headers: corsHeaders }); }

  try {
    const payload = await req.json();
    const type = payload.type; // "INSERT", "UPDATE", "DELETE"
    
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary environment variables");
    }

    const credentials = btoa(`${apiKey}:${apiSecret}`);
    const headers = { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" };

    // Supabase client para encolar fallos
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- CLOUDINARY ACTIONS --- //

    // Action 1: Remove pending tag and add "confirmed" 
    const confirmAsset = async (public_id: string, resource_type: string = "image") => {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/tags`;
      const data = new URLSearchParams([
        ["public_ids[]", public_id], ["tag", "confirmed"], ["command", "replace"]
      ]);
      await fetch(url, { method: "POST", headers: { Authorization: `Basic ${credentials}` }, body: data });
      console.log(`[+] Asset ${public_id} (${resource_type}) confirmed.`);
    };

    // Action 2: Delete asset permanently from Cloudinary. Si falla, encola para reintento.
    const destroyAsset = async (public_id: string, resource_type: string = "image") => {
      try {
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resource_type}/upload?public_ids[]=${public_id}`;
        const response = await fetch(url, { method: "DELETE", headers });
        const result = await response.json();

        // Verificar si realmente se borró
        if (result.deleted && (result.deleted[public_id] === "deleted" || result.deleted[public_id] === "not_found")) {
          console.log(`[-] Asset ${public_id} (${resource_type}) deleted permanently.`);
        } else {
          // Cloudinary respondió pero no borró → encolar
          console.warn(`[!] Respuesta inesperada al borrar ${public_id}:`, result);
          await queueForDeletion(supabase, public_id, resource_type);
        }
      } catch (err) {
        // Error de red o timeout → encolar para reintento
        console.error(`[!] Error al borrar ${public_id}:`, err.message);
        await queueForDeletion(supabase, public_id, resource_type);
      }
    };

    // --- WEBHOOK LOGIC PARSER --- //
    
    const record = payload.record || null;
    const old_record = payload.old_record || null;

    // Process each asset field (image and video) independently
    for (const { column, resource_type } of ASSET_FIELDS) {
      if (type === "INSERT" && record?.[column]) {
        await confirmAsset(record[column], resource_type);
      } 
      
      else if (type === "DELETE" && old_record?.[column]) {
        await destroyAsset(old_record[column], resource_type);
      } 
      
      else if (type === "UPDATE") {
        const newId = record?.[column];
        const oldId = old_record?.[column];

        // If the asset ID changed (or was removed), delete the old one from Cloudinary
        if (oldId && oldId !== newId) {
          await destroyAsset(oldId, resource_type);
        }
        // If there is a new asset ID, and it's different from the old one, confirm it
        if (newId && newId !== oldId) {
          await confirmAsset(newId, resource_type);
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
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});

/**
 * Encola un asset para eliminación posterior por el cron.
 * Usa ON CONFLICT para evitar duplicados si el PG trigger ya lo encoló.
 */
async function queueForDeletion(supabase: any, public_id: string, resource_type: string) {
  const { error } = await supabase
    .from("cloudinary_delete_queue")
    .upsert(
      { public_id, resource_type },
      { onConflict: "public_id" }
    );

  if (error) {
    console.error(`[!] Error al encolar ${public_id}:`, error);
  } else {
    console.log(`[Q] Asset ${public_id} encolado para reintento por el cron.`);
  }
}
