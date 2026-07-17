// Wrapper de `eas update` que fija APP_ENV según el canal.
//
// Por qué existe: el `env` de los build profiles de eas.json SOLO aplica a
// builds, no a `eas update`. Si publicás un OTA sin APP_ENV, app.config.js cae
// al variant "production" → resuelve otro set de plugins → otro runtimeVersion
// (fingerprint) → el update queda en un runtime que ningún build instalado pide,
// y el dispositivo nunca lo ve. Este wrapper garantiza el APP_ENV correcto de
// forma cross-platform (npm scripts corren en cmd o sh según el SO, y no hay
// una sintaxis inline de env var que sirva en ambos).
//
// Uso: node scripts/eas-update.mjs <preview|production> [args extra de eas]
import { spawnSync } from "node:child_process";

const channel = process.argv[2];
const extraArgs = process.argv.slice(3);

if (channel !== "preview" && channel !== "production") {
  console.error(
    `Canal inválido: "${channel ?? ""}". Usá "preview" o "production".`
  );
  process.exit(1);
}

// eas update exporta --platform=all por default, que incluye web; el bundle web
// rompe por expo-sqlite (wa-sqlite.wasm ausente) y esta app no corre en web (la
// web es apps/web / Next.js). Restringimos a android (único target distribuido
// hoy; no hay builds iOS). El flag --platform NO afecta el fingerprint, así que
// es seguro respecto del runtime del build instalado. Para publicar iOS más
// adelante: pasar `-- --platform ios` (o all cuando web deje de romper). NO
// arreglar esto tocando `platforms` en app.json: eso cambia el fingerprint y el
// update quedaría en un runtime que ningún build instalado pide.
const hasPlatform = extraArgs.some(
  (a) => a === "--platform" || a === "-p" || a.startsWith("--platform=")
);
const platformArgs = hasPlatform ? [] : ["--platform", "android"];

// El canal es también el branch y el APP_ENV: los tres coinciden por diseño
// (ver variants en app.config.js). Si en el futuro divergen, mapear acá.
const result = spawnSync(
  "npx",
  ["eas-cli", "update", "--branch", channel, ...platformArgs, ...extraArgs],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, APP_ENV: channel },
  }
);

process.exit(result.status ?? 1);
