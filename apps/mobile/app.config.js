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

// Plugin de Sentry solo si el build tiene credenciales (EAS secrets): sube
// sourcemaps/símbolos nativos. Sin token, el build funciona igual y el SDK
// JS reporta errores sin symbolicar (mejor que nada).
const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
  ? [
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT ?? "gymtrack-mobile",
        },
      ],
    ]
  : [];

// Health Connect / HealthKit tras feature flag. Producción se lanza SIN los
// permisos de salud (Google Play exige una declaración de salud aprobada, que
// demora semanas); dev y preview los mantienen para seguir desarrollando.
// Cuando Google apruebe la declaración: EXPO_PUBLIC_HEALTH=1 en el profile de
// producción de eas.json y nuevo build. El flag viaja al runtime vía
// extra.healthEnabled (lib/health elige el client real o el stub).
const HEALTH_ENABLED =
  process.env.EXPO_PUBLIC_HEALTH === "1" || APP_ENV !== "production";

const HEALTH_PLUGINS = new Set([
  "@kingstinct/react-native-healthkit",
  "react-native-health-connect",
  "./plugins/with-health-connect-rationale.js",
  "./plugins/with-health-connect-delegate.js",
]);

const basePlugins = appJson.expo.plugins ?? [];
const plugins = [
  ...(HEALTH_ENABLED
    ? basePlugins
    : basePlugins.filter(
        (p) => !HEALTH_PLUGINS.has(Array.isArray(p) ? p[0] : p)
      )),
  ...sentryPlugin,
];

const basePermissions = appJson.expo.android?.permissions ?? [];
const androidPermissions = HEALTH_ENABLED
  ? basePermissions
  : basePermissions.filter((p) => !p.startsWith("android.permission.health."));

export default {
  expo: {
    ...appJson.expo, // ← acá entra TODO tu app.json intacto
    plugins,
    name: variant.name, // pisa solo el name
    updates: {
      url: "https://u.expo.dev/c5abcb20-7e97-4ed1-95b4-51dede8977c4",
    },
    extra: {
      ...appJson.expo.extra,
      appEnv: APP_ENV,
      healthEnabled: HEALTH_ENABLED,
    },
    ios: {
      ...appJson.expo.ios, // mantiene todo tu bloque ios
      bundleIdentifier: variant.bundleId, // pisa solo el bundleIdentifier
    },
    android: {
      ...appJson.expo.android, // mantiene todo tu bloque android
      permissions: androidPermissions,
      package: variant.bundleId, // pisa solo el package
    },
  },
};
