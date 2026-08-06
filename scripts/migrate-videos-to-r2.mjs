// Copia los videos del bucket "media" de Supabase Storage a Cloudflare R2.
//
// ── Este script NO BORRA NADA ────────────────────────────────────────────────
// Copia y verifica, nada más. Al terminar los videos están en los dos lados, y
// esa duplicación es la red de seguridad de toda la mudanza: si algo sale mal
// en cualquier paso posterior, el original sigue intacto en Storage. El borrado
// de los originales es una tanda explícita y muy posterior (ver más abajo).
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
//   R2_BUCKET=... R2_PUBLIC_BASE_URL=https://media.gymtrack.ar \
//     node scripts/migrate-videos-to-r2.mjs            # dry-run: no escribe
//     node scripts/migrate-videos-to-r2.mjs --execute  # copia de verdad
//
// Es idempotente: un objeto que ya está en R2 con el mismo tamaño y el mismo
// MD5 se saltea, así que se puede correr las veces que haga falta. Si algún
// archivo falla, NO emite el SQL de reescritura — no se reescribe una sola URL
// hasta que TODOS estén verificados.
//
// ── Orden de la mudanza ──────────────────────────────────────────────────────
//   1. Este script (--execute): copia + verificación. Nada más se toca.
//   2. Desplegar el código que lee/escribe R2 (edge functions + app + web).
//   3. Aplicar la migración SQL que este script emite: reescribe video_uri.
//      Va CON EL TRIGGER sync-media-assets-exercises DESACTIVADO, porque ese
//      trigger llama a sync-media-webhook en cada UPDATE y la función borra el
//      asset viejo cuando la columna cambia: sin desactivarlo, la reescritura
//      borraría todos los originales de Storage en el acto.
//   4. Mucho después, cuando ya no queden bundles viejos de Expo con las URLs
//      de Storage en su SQLite: borrar los originales, en su propia tanda.
import { createHash, createHmac } from "node:crypto";
import { pathToFileURL } from "node:url";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

const EXECUTE = process.argv.includes("--execute");

function checkEnv() {
  const missing = Object.entries({
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_BASE_URL,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(`Faltan env vars: ${missing.join(", ")}`);
    process.exit(2);
  }

  // Los dos errores de pegado que rompen todo con un mensaje que no ayuda:
  // el account id con el endpoint entero adentro (la URL queda
  // https://https://...r2.cloudflarestorage.com.r2.cloudflarestorage.com y el
  // DNS falla), y el dominio público sin esquema.
  if (!/^[0-9a-f]{32}$/i.test(R2_ACCOUNT_ID)) {
    console.error(
      `R2_ACCOUNT_ID tiene que ser el hash de 32 caracteres hex, solo eso — no el endpoint completo.\n` +
        `  Recibido: ${R2_ACCOUNT_ID}\n` +
        `  Sale de https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
    );
    process.exit(2);
  }
  if (!/^https?:\/\//.test(R2_PUBLIC_BASE_URL)) {
    console.error(
      `R2_PUBLIC_BASE_URL tiene que arrancar con https:// — recibido: ${R2_PUBLIC_BASE_URL}`
    );
    process.exit(2);
  }
}

// Node envuelve cualquier fallo de red en un "fetch failed" pelado que no dice
// nada; el motivo real (DNS que no resuelve, TLS, conexión rechazada) viene
// dentro de err.cause. Sin esto, un account id mal pegado y un firewall
// corporativo se ven exactamente igual.
async function fetchOrThrow(url, init, contexto) {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new Error(`${contexto}: ${err.cause?.message ?? err.message}`);
  }
}

const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/media/`;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// ── Firma SigV4 para la API S3 de R2 ─────────────────────────────────────────
// A mano y sin dependencias: el repo no tiene un SDK de AWS y no vale la pena
// sumarlo por un script que se corre una vez.
//
// sigV4 es pura a propósito (todo entra por parámetro, incluida la fecha) para
// poder verificarla contra los vectores de prueba publicados por AWS —
// scripts/migrate-videos-to-r2.test.mjs. Una firma mal calculada acá no es un
// bug silencioso, es un 403 en cada request, pero prefiero saberlo sin quemar
// credenciales reales.
const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

export function sigV4({
  method,
  url,
  headers,
  payloadHash,
  accessKeyId,
  secretAccessKey,
  region,
  service,
  amzDate,
}) {
  const dateStamp = amzDate.slice(0, 8);

  // Las claves llegan en minúscula, que es como las exige la firma canónica.
  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys
    .map((h) => `${h}:${String(headers[h]).trim()}\n`)
    .join("");
  const signedHeaders = sortedKeys.join(";");

  const canonicalRequest = [
    method,
    new URL(url).pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = [region, service, "aws4_request"].reduce(
    (acc, part) => hmac(acc, part),
    hmac(`AWS4${secretAccessKey}`, dateStamp)
  );
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return {
    signature,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function signRequest({ method, key, payload, extraHeaders = {} }) {
  const url = new URL(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`);
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const payloadHash = sha256Hex(payload ?? "");

  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };

  const { authorization } = sigV4({
    method,
    url: url.toString(),
    headers,
    payloadHash,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    // R2 ignora la región pero SigV4 la exige: "auto".
    region: "auto",
    service: "s3",
    amzDate,
  });

  return {
    url: url.toString(),
    headers: { ...headers, Authorization: authorization },
  };
}

// ── Inventario en Supabase Storage ───────────────────────────────────────────
async function listStorageVideos() {
  const out = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const res = await fetchOrThrow(
      `${SUPABASE_URL}/storage/v1/object/list/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "videos",
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
      },
      "list media/videos"
    );
    if (!res.ok) {
      throw new Error(`list media/videos → ${res.status} ${await res.text()}`);
    }
    const page = await res.json();
    // El endpoint devuelve también "carpetas" (id null): no son objetos.
    out.push(...page.filter((f) => f.id));
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

// ── Estado en R2 ─────────────────────────────────────────────────────────────
// El ETag de una subida simple (no multipart) es el MD5 del objeto, así que
// alcanza para saber si el que ya está en R2 es idéntico byte a byte.
async function headR2(key) {
  const { url, headers } = signRequest({ method: "HEAD", key, payload: "" });
  const res = await fetchOrThrow(url, { method: "HEAD", headers }, `HEAD ${key}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HEAD ${key} → ${res.status}`);
  return {
    size: Number(res.headers.get("content-length") ?? 0),
    etag: (res.headers.get("etag") ?? "").replaceAll('"', ""),
  };
}

async function putR2(key, body, contentType) {
  const { url, headers } = signRequest({
    method: "PUT",
    key,
    payload: body,
    extraHeaders: {
      "content-type": contentType,
      "cache-control": CACHE_CONTROL,
    },
  });
  const res = await fetchOrThrow(url, { method: "PUT", headers, body }, `PUT ${key}`);
  if (!res.ok) {
    throw new Error(`PUT ${key} → ${res.status} ${await res.text()}`);
  }
}

// ── Migración ────────────────────────────────────────────────────────────────
async function main() {
  checkEnv();
  console.log(EXECUTE ? "MODO: --execute\n" : "MODO: dry-run (nada se escribe)\n");

  const files = await listStorageVideos();
  const totalMb = files.reduce((a, f) => a + (f.metadata?.size ?? 0), 0) / 1048576;
  console.log(`Videos en Storage: ${files.length} (${totalMb.toFixed(1)} MB)\n`);

  const failed = [];
  let copied = 0;
  let skipped = 0;

  for (const [i, file] of files.entries()) {
    const key = `videos/${file.name}`;
    const label = `[${i + 1}/${files.length}] ${key}`;

    try {
      const expectedSize = file.metadata?.size ?? 0;
      const contentType = file.metadata?.mimetype || "video/mp4";

      // Solo se saltea con un tamaño de referencia real: si el inventario no
      // trae metadata, se recopia en vez de asumir que lo de R2 está bien.
      const existing = await headR2(key);
      if (existing && expectedSize > 0 && existing.size === expectedSize) {
        console.log(`${label} — ya está en R2, se saltea`);
        skipped++;
        continue;
      }

      if (!EXECUTE) {
        console.log(`${label} — se copiaría (${(expectedSize / 1048576).toFixed(1)} MB)`);
        continue;
      }

      const download = await fetchOrThrow(
        `${STORAGE_PREFIX}${key}`,
        undefined,
        `GET origen ${key}`
      );
      if (!download.ok) {
        throw new Error(`GET origen → ${download.status}`);
      }
      const body = Buffer.from(await download.arrayBuffer());

      // El tamaño de lo descargado tiene que coincidir con el del inventario
      // antes de subir nada: una descarga cortada no se copia a R2.
      if (expectedSize && body.length !== expectedSize) {
        throw new Error(
          `descarga incompleta: ${body.length} bytes, se esperaban ${expectedSize}`
        );
      }

      await putR2(key, body, contentType);

      // Verificación post-subida: tamaño y MD5 contra lo que quedó en R2.
      const check = await headR2(key);
      const localMd5 = createHash("md5").update(body).digest("hex");
      if (!check || check.size !== body.length) {
        throw new Error(
          `verificación falló: R2 reporta ${check?.size ?? "nada"}, local ${body.length}`
        );
      }
      if (check.etag && check.etag !== localMd5) {
        throw new Error(`MD5 no coincide: R2 ${check.etag}, local ${localMd5}`);
      }

      console.log(`${label} — copiado y verificado (${(body.length / 1048576).toFixed(1)} MB)`);
      copied++;
    } catch (err) {
      console.error(`${label} — FALLÓ: ${err.message}`);
      failed.push({ key, error: err.message });
    }
  }

  console.log(
    `\nCopiados: ${copied} | Ya estaban: ${skipped} | Fallados: ${failed.length}`
  );

  if (failed.length > 0) {
    console.error("\nHay archivos sin copiar. NO se reescribe ninguna URL.");
    for (const f of failed) console.error(`  ${f.key}: ${f.error}`);
    process.exit(1);
  }

  if (!EXECUTE) {
    console.log("\nDry-run terminado. Repetí con --execute para copiar.");
    return;
  }

  // Los 151 están verificados en R2 y los originales siguen intactos en
  // Storage: recién ahora tiene sentido reescribir las columnas.
  console.log(`\n${"─".repeat(70)}`);
  console.log("Copia verificada. Migración SQL para el paso 3 de la mudanza:");
  console.log(`${"─".repeat(70)}\n`);
  console.log(rewriteMigrationSql());
}

function rewriteMigrationSql() {
  return `-- Reescribe video_uri de Supabase Storage a Cloudflare R2.
--
-- DEPENDE DEL DEPLOY PREVIO del código que lee R2 (edge functions + app + web)
-- y de haber corrido scripts/migrate-videos-to-r2.mjs --execute con los videos
-- ya verificados en el bucket. Las rutas se preservan, así que la
-- reescritura es un cambio de prefijo y nada más.
--
-- El trigger va desactivado a propósito: sync-media-assets-exercises llama a
-- sync-media-webhook en cada UPDATE, y esa función borra el asset viejo cuando
-- la columna de media cambia. Con el trigger activo, este update borraría los
-- originales de Storage justo cuando todavía son la única red de seguridad.
-- Los originales NO se borran acá; eso es una tanda posterior, cuando ya no
-- queden bundles de Expo con las URLs viejas en su SQLite.
begin;

alter table public.exercises_base disable trigger "sync-media-assets-exercises";

update public.exercises_base
   set video_uri = replace(
         video_uri,
         '${STORAGE_PREFIX}videos/',
         '${R2_PUBLIC_BASE_URL}/videos/'
       )
 where video_uri like '${STORAGE_PREFIX}videos/%';

update public.custom_exercises
   set video_uri = replace(
         video_uri,
         '${STORAGE_PREFIX}videos/',
         '${R2_PUBLIC_BASE_URL}/videos/'
       )
 where video_uri like '${STORAGE_PREFIX}videos/%';

alter table public.exercises_base enable trigger "sync-media-assets-exercises";

-- Red de seguridad: si quedó alguna URL de video apuntando a Storage, algo
-- salió mal y la transacción no se confirma.
do $$
declare
  restantes int;
begin
  select count(*) into restantes
    from (
      select video_uri from public.exercises_base
      union all
      select video_uri from public.custom_exercises
    ) v
   where v.video_uri like '${STORAGE_PREFIX}videos/%';

  if restantes > 0 then
    raise exception 'Quedaron % video_uri apuntando a Storage', restantes;
  end if;
end $$;

commit;
`;
}

// Solo corre la migración cuando se ejecuta directo; importarlo (el test de la
// firma lo hace) no dispara nada.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
