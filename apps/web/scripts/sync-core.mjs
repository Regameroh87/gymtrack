// Re-sincroniza la copia de @gymtrack/core en node_modules antes de dev/build.
//
// apps/web queda FUERA del `workspaces` raíz y declara @gymtrack/core como
// `file:../../packages/core`, que npm copia una sola vez y nunca refresca. Esa
// copia se desincroniza cuando cambia packages/core (ej: el drop de
// activities.coach_id de multi-coach), y la web termina mandando columnas que ya
// no existen. Este script recopia el source fresco (package.json + src/) sobre
// la copia instalada, dejando afuera cualquier node_modules.
import { cpSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const coreRoot = resolve(here, "../../../packages/core");
const dest = resolve(here, "../node_modules/@gymtrack/core");

// Copia limpia: borra la copia vieja para no dejar archivos huérfanos.
rmSync(dest, { recursive: true, force: true });

cpSync(resolve(coreRoot, "src"), resolve(dest, "src"), { recursive: true });
cpSync(resolve(coreRoot, "package.json"), resolve(dest, "package.json"));

if (!existsSync(resolve(dest, "src"))) {
  console.error("[sync-core] fallo al copiar @gymtrack/core");
  process.exit(1);
}

console.log("[sync-core] @gymtrack/core sincronizado desde packages/core");
