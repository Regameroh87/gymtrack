// app.config.js
const appJson = require("./app.json");

const APP_ENV = process.env.APP_ENV ?? "production";

const variants = {
  development: { name: "Gymtrack (Dev)", bundleId: "ar.gymtrack.app.dev" },
  preview: { name: "Gymtrack (Preview)", bundleId: "ar.gymtrack.app.preview" },
  production: { name: "Gymtrack", bundleId: "ar.gymtrack.app" },
};

const variant = variants[APP_ENV];

export default {
  ...appJson.expo, // ← acá entra TODO tu app.json intacto
  name: variant.name, // pisa solo el name
  ios: {
    ...appJson.expo.ios, // mantiene todo tu bloque ios
    bundleIdentifier: variant.bundleId, // pisa solo el bundleIdentifier
  },
  android: {
    ...appJson.expo.android, // mantiene todo tu bloque android
    package: variant.bundleId, // pisa solo el package
  },
};
