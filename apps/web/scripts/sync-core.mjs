// Re-sincroniza la copia de @gymtrack/core en node_modules antes de dev/build.
//
// apps/web queda FUERA del `workspaces` raíz y declara @gymtrack/core como
// `file:../../packages/core`, que npm copia una sola vez y nunca refresca. Esa
// copia se desincroniza cuando cambia packages/core (ej: el drop de
// activities.coach_id de multi-coach), y la web termina mandando columnas que ya
// no existen. Este script recopia el source fresco (package.json + src/) sobre
// la copia instalada, dejando afuera cualquier node_modules.
//
// ── Y ADEMÁS INVALIDA LA CACHÉ DE WEBPACK ───────────────────────────────────
//
// Recopiar no alcanzaba, y costó un incidente en producción descubrirlo: la
// pantalla de membresías se caía entera con "owedPeriods is not a function"
// aunque el archivo estaba en la copia y el index.js lo reexportaba.
//
// La caché persistente de webpack (.next/cache) guarda el mapa de exports de
// cada módulo. Cuando packages/core suma un archivo nuevo, la copia se refresca
// pero webpack sigue sirviendo el mapa viejo, en el que ese archivo no existía.
// Los imports que apuntan a lo nuevo se resuelven a undefined y —esto es lo
// peligroso— webpack lo reporta como WARNING, no como error: el build pasa, el
// deploy sale, y revienta recién en el navegador del usuario.
//
// Vercel cachea .next/cache entre builds, así que esto no es un problema solo
// local: es exactamente lo que pasó en producción.
//
// Por eso, cuando el contenido de core cambia, se tira la caché. Cuesta un build
// más lento cada vez que se toca packages/core (rara vez), a cambio de que sea
// imposible shippear un bundle con medio módulo resuelto.
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const coreRoot = resolve(here, "../../../packages/core");
const dest = resolve(here, "../node_modules/@gymtrack/core");
const nextCache = resolve(here, "../.next/cache");
const stamp = resolve(here, "../node_modules/.gymtrack-core-hash");

// Hash del contenido, no de los mtime: copiar reescribe los timestamps en cada
// build, así que compararlos daría "cambió" siempre y la caché no serviría nunca.
const hashDir = (dir) => {
  const h = createHash("sha1");
  const walk = (d) => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else h.update(entry).update(readFileSync(full));
    }
  };
  walk(dir);
  return h.digest("hex");
};

const hash = hashDir(resolve(coreRoot, "src"));
const previo = existsSync(stamp) ? readFileSync(stamp, "utf8").trim() : null;

// Copia limpia: borra la copia vieja para no dejar archivos huérfanos.
rmSync(dest, { recursive: true, force: true });

cpSync(resolve(coreRoot, "src"), resolve(dest, "src"), { recursive: true });
cpSync(resolve(coreRoot, "package.json"), resolve(dest, "package.json"));

if (!existsSync(resolve(dest, "src"))) {
  console.error("[sync-core] fallo al copiar @gymtrack/core");
  process.exit(1);
}

writeFileSync(stamp, hash);

if (previo !== hash && existsSync(nextCache)) {
  rmSync(nextCache, { recursive: true, force: true });
  console.log("[sync-core] @gymtrack/core cambió: caché de webpack invalidada");
}

console.log("[sync-core] @gymtrack/core sincronizado desde packages/core");
