import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // --- CLOUDINARY ACTIONS --- //

    // Action 1: Remove pending tag and add "confirmed" 
    const confirmAsset = async (public_id: string, resource_type: string = "image") => {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/tags`;
      const data = new URLSearchParams([
        ["public_ids[]", public_id], ["tag", "confirmed"], ["command", "replace"]
      ]);
      await fetch(url, { method: "POST", headers: { Authorization: `Basic ${credentials}` }, body: data });
      console.log(`[+] Asset ${public_id} confirmed.`);
    };

    // Action 2: Delete asset permanently from Cloudinary
    const destroyAsset = async (public_id: string, resource_type: string = "image") => {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/upload?public_ids[]=${public_id}`;
      await fetch(url, { method: "DELETE", headers });
      console.log(`[-] Asset ${public_id} deleted permanently.`);
    };


    // --- WEBHOOK LOGIC PARSER --- //
    
    const record = payload.record || null;
    const old_record = payload.old_record || null;

    if (type === "INSERT" && record?.cloudinary_image_public_id) {
       await confirmAsset(record.cloudinary_image_public_id);
    } 
    
    else if (type === "DELETE" && old_record?.cloudinary_image_public_id) {
       await destroyAsset(old_record.cloudinary_image_public_id);
    } 
    
    else if (type === "UPDATE") {
        const newId = record?.cloudinary_image_public_id;
        const oldId = old_record?.cloudinary_image_public_id;

        // If the photo ID changed (or was removed), delete the old one from Cloudinary
        if (oldId && oldId !== newId) {
            await destroyAsset(oldId);
        }
        // If there is a new photo ID, and it's different from the old one, confirm it
        if (newId && newId !== oldId) {
            await confirmAsset(newId);
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
