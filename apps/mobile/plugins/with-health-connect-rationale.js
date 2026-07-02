// Health Connect (Android 14+) exige que la app declare cómo muestra su
// rationale de permisos de salud: un intent-filter en la MainActivity para
// ACTION_SHOW_PERMISSIONS_RATIONALE y un activity-alias para que "Ver uso de
// permisos" en Ajustes abra la app. El plugin de react-native-health-connect
// no los agrega, así que los inyectamos acá.
const { withAndroidManifest } = require("expo/config-plugins");

const RATIONALE_ACTION = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";

function withHealthConnectRationale(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) return config;

    const mainActivity = (app.activity ?? []).find(
      (a) => a.$["android:name"] === ".MainActivity",
    );
    if (mainActivity) {
      mainActivity["intent-filter"] = mainActivity["intent-filter"] ?? [];
      const hasRationale = mainActivity["intent-filter"].some((f) =>
        (f.action ?? []).some((a) => a.$["android:name"] === RATIONALE_ACTION),
      );
      if (!hasRationale) {
        mainActivity["intent-filter"].push({
          action: [{ $: { "android:name": RATIONALE_ACTION } }],
        });
      }
    }

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
