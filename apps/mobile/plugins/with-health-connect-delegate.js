// El plugin de react-native-health-connect solo inyecta el intent-filter de
// rationale en el manifest; el registro del permission delegate en
// MainActivity.onCreate (requerido por la lib para poder abrir el diálogo de
// permisos) queda a cargo de la app. Sin él, requestPermission() revienta con
// "lateinit property requestPermission has not been initialized".
const { withMainActivity } = require("expo/config-plugins");

const IMPORT =
  "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate";
const REGISTER = "HealthConnectPermissionDelegate.setPermissionDelegate(this)";

function withHealthConnectDelegate(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      throw new Error(
        "with-health-connect-delegate espera MainActivity en Kotlin; ajustá el plugin para Java."
      );
    }
    let src = config.modResults.contents;

    if (!src.includes(IMPORT)) {
      src = src.replace(/^package .*$/m, (line) => `${line}\n\n${IMPORT}`);
    }

    if (!src.includes(REGISTER)) {
      // El template de Expo ya define onCreate (por expo-splash-screen);
      // registramos el delegate justo después de super.onCreate(...).
      const anchor = /super\.onCreate\([^)]*\)/;
      if (!anchor.test(src)) {
        throw new Error(
          "with-health-connect-delegate: no encontré super.onCreate en MainActivity."
        );
      }
      src = src.replace(anchor, (call) => `${call}\n    ${REGISTER}`);
    }

    config.modResults.contents = src;
    return config;
  });
}

module.exports = withHealthConnectDelegate;
