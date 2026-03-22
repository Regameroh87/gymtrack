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
    // 1. Limpiamos el public_id por si viene con extensión (ej: .mp4)
    let { public_id, resource_type = "video" } = await req.json();
  

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Faltan variables de entorno de Cloudinary");
    }

    // 2. Generamos el timestamp una sola vez
    const timestamp = Math.floor(Date.now() / 1000);

    // 3. FIRMA: Orden alfabético estricto y concatenación limpia
    const stringToSign = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
    
    // IMPORTANTE: .toString(CryptoJS.enc.Hex) asegura que sea el formato que Cloudinary entiende
    const signature = CryptoJS.SHA1(stringToSign).toString(CryptoJS.enc.Hex);
    // Forzamos el encoding a Hexadecimal (minúsculas)


    const formData = new FormData();
    formData.append("public_id", public_id);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);

    // 4. URL dinámica según el tipo de recurso
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/destroy`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
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
