// Borra los videos originales del bucket "media" de Supabase Storage, una vez
// que la mudanza a R2 está cerrada y verificada.
//
// ── Esto SÍ borra, y borra la última copia ───────────────────────────────────
// Hasta acá los videos estaban en los dos lados y esa duplicación era la red de
// seguridad de toda la mudanza. Este script la retira. Por eso no borra nada
// que no haya verificado primero, archivo por archivo, contra R2:
//
//   Guarda 1 — ninguna fila de la BD puede seguir apuntando a Storage. Si
//              queda una sola, aborta sin borrar nada: significa que la
//              migración de video_uri no corrió o corrió a medias.
//   Guarda 2 — cada objeto tiene que existir en R2 con el mismo tamaño. El que
//              no pase se saltea y se queda en Storage; nunca se borra "por las
//              dudas".
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
//   R2_BUCKET=... R2_PUBLIC_BASE_URL=https://media.gymtrack.ar \
//     node scripts/delete-storage-video-originals.mjs            # dry-run
//     node scripts/delete-storage-video-originals.mjs --execute  # borra
//
// Antes de correrlo con --execute conviene pasar el dry-run de
// migrate-videos-to-r2.mjs: si dice "Ya estaban: N | Fallados: 0", R2 tiene
// todo y la verificación de acá va a pasar entera.
//
// Después de este borrado queda un último paso, aparte: restringir la policy de
// INSERT del bucket a images/ (ver supabase/migrations/).
import { signRequest } from "./migrate-videos-to-r2.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EXECUTE = process.argv.includes("--execute");

// Las tablas con columna de video. Si alguna sigue apuntando a Storage, no se
// borra nada.
const VIDEO_REFS = [
  ["exercises_base", "video_uri"],
  ["custom_exercises", "video_uri"],
];

const BATCH = 50;

function checkEnv() {
  const missing = Object.entries({
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(`Faltan env vars: ${missing.join(", ")}`);
    process.exit(2);
  }
}

const supabaseHeaders = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  "Content-Type": "application/json",
};

async function fetchOrThrow(url, init, contexto) {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new Error(`${contexto}: ${err.cause?.message ?? err.message}`);
  }
}

// ── Guarda 1: ¿queda algo apuntando a Storage? ───────────────────────────────
// El count exacto sale del header content-range de PostgREST (Prefer:
// count=exact), que no depende de traer las filas.
async function countStorageRefs(table, column) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/media/videos/`;
  const url =
    `${SUPABASE_URL}/rest/v1/${table}` +
    `?select=${column}&${column}=like.${encodeURIComponent(`${prefix}%`)}&limit=1`;

  const res = await fetchOrThrow(
    url,
    { headers: { ...supabaseHeaders, Prefer: "count=exact" } },
    `count ${table}.${column}`
  );
  if (!res.ok) {
    throw new Error(`count ${table}.${column} → ${res.status} ${await res.text()}`);
  }
  // content-range viene como "0-0/162" o "*/0".
  const total = res.headers.get("content-range")?.split("/")[1];
  return Number(total ?? 0);
}

// ── Inventario en Storage ────────────────────────────────────────────────────
async function listStorageVideos() {
  const out = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const res = await fetchOrThrow(
      `${SUPABASE_URL}/storage/v1/object/list/media`,
      {
        method: "POST",
        headers: supabaseHeaders,
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
    out.push(...page.filter((f) => f.id));
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

// ── Guarda 2: el objeto tiene que estar en R2 con el mismo tamaño ────────────
async function r2Size(key) {
  const { url, headers } = signRequest({ method: "HEAD", key, payload: "" });
  const res = await fetchOrThrow(url, { method: "HEAD", headers }, `HEAD ${key}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HEAD ${key} → ${res.status}`);
  return Number(res.headers.get("content-length") ?? 0);
}

async function removeFromStorage(paths) {
  const res = await fetchOrThrow(
    `${SUPABASE_URL}/storage/v1/object/media`,
    {
      method: "DELETE",
      headers: supabaseHeaders,
      body: JSON.stringify({ prefixes: paths }),
    },
    "delete media"
  );
  if (!res.ok) {
    throw new Error(`DELETE media → ${res.status} ${await res.text()}`);
  }
}

async function main() {
  checkEnv();
  console.log(EXECUTE ? "MODO: --execute\n" : "MODO: dry-run (no borra nada)\n");

  // ── Guarda 1 ───────────────────────────────────────────────────────────────
  console.log("── Guarda 1: referencias a Storage en la BD ──");
  let refs = 0;
  for (const [table, column] of VIDEO_REFS) {
    const n = await countStorageRefs(table, column);
    console.log(`  ${table}.${column}: ${n}`);
    refs += n;
  }
  if (refs > 0) {
    console.error(
      `\nHay ${refs} filas apuntando todavía a Storage. NO se borra nada.\n` +
        `Aplicá primero la migración que reescribe video_uri a R2.`
    );
    process.exit(1);
  }
  console.log("  Ninguna fila apunta a Storage.\n");

  // ── Guarda 2 ───────────────────────────────────────────────────────────────
  console.log("── Guarda 2: cada objeto verificado en R2 ──");
  const files = await listStorageVideos();
  const totalMb = files.reduce((a, f) => a + (f.metadata?.size ?? 0), 0) / 1048576;
  console.log(`  Videos en Storage: ${files.length} (${totalMb.toFixed(1)} MB)\n`);

  const borrables = [];
  const salteados = [];

  for (const [i, file] of files.entries()) {
    const key = `videos/${file.name}`;
    const esperado = file.metadata?.size ?? 0;
    const label = `[${i + 1}/${files.length}] ${key}`;

    try {
      const enR2 = await r2Size(key);
      if (enR2 === null) {
        console.error(`${label} — NO está en R2, se saltea`);
        salteados.push({ key, motivo: "no está en R2" });
      } else if (esperado > 0 && enR2 !== esperado) {
        console.error(
          `${label} — tamaño distinto (R2 ${enR2}, Storage ${esperado}), se saltea`
        );
        salteados.push({ key, motivo: `tamaño ${enR2} vs ${esperado}` });
      } else {
        borrables.push(key);
      }
    } catch (err) {
      console.error(`${label} — no se pudo verificar: ${err.message}, se saltea`);
      salteados.push({ key, motivo: err.message });
    }
  }

  console.log(
    `\n  Verificados en R2: ${borrables.length} | Salteados: ${salteados.length}`
  );

  if (!EXECUTE) {
    console.log(
      `\nDry-run: se borrarían ${borrables.length} objetos de Storage ` +
        `(${totalMb.toFixed(1)} MB aprox).`
    );
    if (salteados.length > 0) {
      console.log("Los salteados se quedarían en Storage:");
      for (const s of salteados) console.log(`  ${s.key}: ${s.motivo}`);
    }
    console.log("\nRepetí con --execute para borrar.");
    return;
  }

  // ── Borrado ────────────────────────────────────────────────────────────────
  console.log("\n── Borrando de Storage ──");
  let borrados = 0;
  for (let i = 0; i < borrables.length; i += BATCH) {
    const lote = borrables.slice(i, i + BATCH);
    await removeFromStorage(lote);
    borrados += lote.length;
    console.log(`  ${borrados}/${borrables.length}`);
  }

  console.log(`\nBorrados: ${borrados} | Salteados: ${salteados.length}`);
  for (const s of salteados) console.error(`  quedó en Storage — ${s.key}: ${s.motivo}`);

  if (salteados.length > 0) process.exit(1);

  console.log(
    "\nListo. Último paso de la mudanza: aplicar la migración que restringe la\n" +
      "policy de INSERT del bucket a images/."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
