import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Soporta invocación manual (Frontend) o Webhooks (Backend)
    // El Webhook guarda los datos de la fila nueva dentro de "record"
    const public_id = payload.record?.cloudinary_image_public_id || payload.public_id;
    const resource_type = payload.resource_type || "image"; // Por defecto asumimos image
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary environment variables");
    }

    if (!public_id) {
      throw new Error("Missing public_id");
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // SIGNATURE: Using 'replace' to remove 'pending_approval' and set 'confirmed'
    const command = "replace";
    const tag = "confirmed";
    
    // Parameters must be in alphabetical order for the signature to be valid
    const stringToSign = `command=${command}&public_ids=${public_id}&tag=${tag}&timestamp=${timestamp}${apiSecret}`;
    const signature = CryptoJS.SHA1(stringToSign).toString(CryptoJS.enc.Hex);

    const formData = new FormData();
    formData.append("public_ids", public_id);
    formData.append("tag", tag);
    formData.append("command", command);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/tags`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
