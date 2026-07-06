// app.config.js
const appJson = require("./app.json");

const APP_ENV = process.env.APP_ENV ?? "production";

const variants = {
  development: { name: "Gymtrack (Dev)", bundleId: "ar.gymtrack.app.dev" },
  preview: { name: "Gymtrack (Preview)", bundleId: "ar.gymtrack.app.preview" },
  production: { name: "Gymtrack", bundleId: "ar.gymtrack.app" },
};

// Si APP_ENV llega vacío o con un valor inesperado (p. ej. una env var que eas
// inyecta desde el dashboard), caemos a production en vez de crashear el config
// con "Cannot read properties of undefined" → exit 1 silencioso en `expo config`.
const variant = variants[APP_ENV] ?? variants.production;

export default {
  expo: {
    ...appJson.expo, // ← acá entra TODO tu app.json intacto
    name: variant.name, // pisa solo el name
    updates: {
      url: "https://u.expo.dev/c5abcb20-7e97-4ed1-95b4-51dede8977c4",
    },
    ios: {
      ...appJson.expo.ios, // mantiene todo tu bloque ios
      bundleIdentifier: variant.bundleId, // pisa solo el bundleIdentifier
    },
    android: {
      ...appJson.expo.android, // mantiene todo tu bloque android
      package: variant.bundleId, // pisa solo el package
    },
  },
};
