// Acceso a Cloudflare R2 desde las edge functions (Deno).
//
// Por qué R2 y solo para video: el bucket "media" de Supabase Storage mezclaba
// imágenes (~15 MB en total) con videos (~2,6 GB). El video es el único asset
// que rompe la economía del plan — es el 99,4% del storage y prácticamente todo
// el egress — mientras que las imágenes entran de sobra en la cuota. R2 no
// cobra egress y su free tier son 10 GB, así que los videos viven acá y las
// imágenes se quedan en Supabase Storage con el RLS y los triggers de siempre.
//
// Variables de entorno requeridas (secrets de la función):
//   R2_ACCOUNT_ID         – subdominio del endpoint S3 de la cuenta.
//   R2_ACCESS_KEY_ID      – token de API de R2 con permiso de lectura/escritura
//   R2_SECRET_ACCESS_KEY    sobre el bucket. NUNCA llega al cliente: el browser
//                           y la app suben con una URL prefirmada.
//   R2_BUCKET             – nombre del bucket (ej. "gymtrack-media").
//   R2_PUBLIC_BASE_URL    – dominio público del bucket, sin barra final
//                           (ej. https://media.gymtrack.ar). Es el prefijo que
//                           queda guardado en las columnas video_uri.
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") ?? "";
const ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
const SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";

export const R2_BUCKET = Deno.env.get("R2_BUCKET") ?? "";
// Sin barra final: se concatena como `${BASE}/${path}`.
export const R2_PUBLIC_BASE_URL = (
  Deno.env.get("R2_PUBLIC_BASE_URL") ?? ""
).replace(/\/$/, "");

// Endpoint S3 de la cuenta. R2 ignora la región pero SigV4 la exige: "auto".
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2IsConfigured = (): boolean =>
  Boolean(
    ACCOUNT_ID &&
      ACCESS_KEY_ID &&
      SECRET_ACCESS_KEY &&
      R2_BUCKET &&
      R2_PUBLIC_BASE_URL
  );

const client = () =>
  new AwsClient({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: "auto",
    service: "s3",
  });

const objectUrl = (path: string) =>
  `${ENDPOINT}/${R2_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

// ── URLs públicas ────────────────────────────────────────────────────────────
// Las columnas de media guardan la URL pública completa (misma convención que
// traía Supabase Storage, así los helpers getMediaUrl/mediaUrl siguen
// devolviendo la URL tal cual y ningún consumidor cambia).
export const r2PublicUrl = (path: string) => `${R2_PUBLIC_BASE_URL}/${path}`;

export const isR2Url = (uri: string): boolean =>
  Boolean(R2_PUBLIC_BASE_URL) && uri.startsWith(`${R2_PUBLIC_BASE_URL}/`);

export const r2PathFromUrl = (url: string): string =>
  url.slice(R2_PUBLIC_BASE_URL.length + 1);

// ── Subida prefirmada ────────────────────────────────────────────────────────
// El cliente (app/web) no puede tener credenciales de R2, así que pide una URL
// PUT prefirmada a la edge function sign-video-upload y sube directo contra
// Cloudflare — el archivo nunca pasa por nuestra infra.
//
// Devuelve también los headers que el cliente DEBE mandar: van dentro de la
// firma (X-Amz-SignedHeaders), así que si no coinciden exactamente R2 rechaza
// el PUT con 403. Que los devuelva el server evita que cliente y firma se
// desincronicen cuando cambie qué headers firmamos.
export async function presignPut({
  path,
  contentType,
  expiresIn = 600,
}: {
  path: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ uploadUrl: string; headers: Record<string, string> }> {
  // Inmutable: el nombre es aleatorio y único, nunca se reescribe. Es lo que
  // permite que Cloudflare lo sirva cacheado indefinidamente.
  const headers = {
    "content-type": contentType,
    "cache-control": "public, max-age=31536000, immutable",
  };

  const url = new URL(objectUrl(path));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const signed = await client().sign(new Request(url, { method: "PUT", headers }), {
    aws: { signQuery: true },
  });

  return { uploadUrl: signed.url, headers };
}

// ── Borrado ──────────────────────────────────────────────────────────────────
// DELETE en S3 es idempotente: borrar algo que no existe devuelve 204. Mismo
// criterio que traía supabase.storage.remove() — "no está" cuenta como éxito.
export async function r2Delete(path: string): Promise<void> {
  const res = await client().fetch(objectUrl(path), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${path} → ${res.status} ${await res.text()}`);
  }
}

// ── Listado ──────────────────────────────────────────────────────────────────
// ListObjectsV2 paginado. Lo usa el barrido de huérfanos del cron; devuelve la
// fecha de subida porque el barrido solo toca archivos de más de 24hs (los
// recién subidos pueden ser de un formulario todavía abierto).
export async function r2List(
  prefix: string
): Promise<Array<{ key: string; lastModified: Date; size: number }>> {
  const out: Array<{ key: string; lastModified: Date; size: number }> = [];
  const aws = client();
  let token: string | undefined;

  do {
    const url = new URL(`${ENDPOINT}/${R2_BUCKET}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("max-keys", "1000");
    if (token) url.searchParams.set("continuation-token", token);

    const res = await aws.fetch(url.toString());
    if (!res.ok) {
      throw new Error(`R2 LIST ${prefix} → ${res.status} ${await res.text()}`);
    }
    const xml = await res.text();

    for (const [, block] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const modified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
      const size = block.match(/<Size>(\d+)<\/Size>/)?.[1];
      if (key) {
        out.push({
          key,
          lastModified: new Date(modified ?? 0),
          size: Number(size ?? 0),
        });
      }
    }

    token = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
    // IsTruncated=false sin token es el fin del listado.
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) token = undefined;
  } while (token);

  return out;
}
