// Health Connect en Android 14+ exige, además del intent-filter de rationale
// que ya inyecta el plugin de react-native-health-connect en MainActivity, un
// activity-alias con VIEW_PERMISSION_USAGE para que "Ver uso de permisos" en
// Ajustes abra la app. Ese alias no lo agrega la lib, así que va acá.
const { withAndroidManifest } = require("expo/config-plugins");

function withHealthConnectRationale(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) return config;

    app["activity-alias"] = app["activity-alias"] ?? [];
    const hasAlias = app["activity-alias"].some(
      (a) => a.$["android:name"] === "ViewPermissionUsageActivity",
    );
    if (!hasAlias) {
      app["activity-alias"].push({
        $: {
          "android:name": "ViewPermissionUsageActivity",
          "android:exported": "true",
          "android:targetActivity": ".MainActivity",
          "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.VIEW_PERMISSION_USAGE" } },
            ],
            category: [
              { $: { "android:name": "android.intent.category.HEALTH_PERMISSIONS" } },
            ],
          },
        ],
      });
    }

    return config;
  });
}

module.exports = withHealthConnectRationale;
