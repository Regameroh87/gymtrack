// Firma una subida de video a Cloudflare R2.
//
// El cliente no puede tener las credenciales de R2 (serían visibles en el
// bundle de la app y en el browser), así que pide acá una URL PUT prefirmada y
// sube el archivo directo contra Cloudflare. El video nunca pasa por esta
// función: solo emitimos la firma.
//
// Autorización: cualquier usuario autenticado, que es exactamente el mismo
// listón que tenía la policy de Storage que esto reemplaza
// ("media_images_insert_authenticated": `to authenticated` + prefijo videos/).
// No es una regresión; si algún día hay que restringirlo a staff del gym, es
// una decisión aparte y el lugar para hacerlo es acá.
//
// Variables de entorno requeridas:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY – para verificar el JWT del que llama.
//   R2_*                                     – ver _shared/r2.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { presignPut, r2IsConfigured, r2PublicUrl } from "../_shared/r2.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// La extensión sale del mime y no del nombre que manda el cliente: el nombre es
// dato no confiable y termina siendo la key del objeto en el bucket.
const EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

// Mismo tope que tenía el bucket de Storage (file_size_limit = 60 MB): mobile
// transcodifica a ~720p antes de subir y web exige el archivo ya comprimido.
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

// Nombre aleatorio no adivinable, igual que en Storage: el bucket es público.
const uniqueName = (extension: string) =>
  `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!r2IsConfigured()) {
      console.error("R2 sin configurar: faltan secrets R2_*");
      return jsonResponse({ error: "Storage de video no configurado." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) {
      return jsonResponse({ error: "No autorizado." }, 401);
    }

    const { data: callerAuth, error: callerAuthError } =
      await supabaseAdmin.auth.getUser(jwt);
    if (callerAuthError || !callerAuth?.user) {
      return jsonResponse({ error: "Token inválido." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const contentType = String(body.content_type ?? "").toLowerCase();
    const sizeBytes = Number(body.size_bytes ?? 0);

    const extension = EXTENSION_BY_MIME[contentType];
    if (!extension) {
      return jsonResponse(
        { error: `Tipo de video no soportado: ${contentType || "(vacío)"}.` },
        400
      );
    }

    // Chequeo sobre el tamaño declarado por el cliente. Una URL PUT prefirmada
    // no puede imponer un límite real de bytes del lado de R2, así que esto
    // frena el caso normal (un archivo grande de verdad) pero no a alguien que
    // mienta el tamaño con un JWT válido. Si eso llegara a importar, el lugar
    // para el corte duro es un Worker de Cloudflare haciendo de proxy del PUT.
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return jsonResponse({ error: "size_bytes es requerido." }, 400);
    }
    if (sizeBytes > MAX_VIDEO_BYTES) {
      return jsonResponse(
        {
          error: `El video supera los ${Math.floor(
            MAX_VIDEO_BYTES / 1024 / 1024
          )} MB.`,
        },
        400
      );
    }

    const path = `videos/${uniqueName(extension)}`;
    const { uploadUrl, headers } = await presignPut({ path, contentType });

    return jsonResponse(
      {
        upload_url: uploadUrl,
        // Headers obligatorios del PUT: van firmados, si no coinciden R2 da 403.
        headers,
        // Lo que termina guardado en la columna video_uri.
        public_url: r2PublicUrl(path),
        path,
      },
      200
    );
  } catch (error) {
    console.error("sign-video-upload:", (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
