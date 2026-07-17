import { View, Text, ActivityIndicator } from "react-native";
import { CloudUpload } from "../../assets/icons";
import { STARTUP_UPDATE_STATUS } from "../hooks/shared/use-startup-update";

// Copy por fase. "checking" es la espera de red inicial; "downloading" ya
// confirmó que hay versión nueva y la está trayendo.
const COPY = {
  [STARTUP_UPDATE_STATUS.CHECKING]: {
    title: "Buscando actualizaciones",
    subtitle: "Verificando que tengas la última versión.",
  },
  [STARTUP_UPDATE_STATUS.DOWNLOADING]: {
    title: "Descargando actualización",
    subtitle: "Instalando la última versión. Falta poco.",
  },
};

/**
 * Splash de actualización mostrado durante el gate OTA del arranque, antes de
 * entrar a la app. Estilo editorial "Kinetic Precision", light/dark completo,
 * coherente con ComingSoonScreen. No depende de las fuentes custom (pueden no
 * haber cargado todavía en este punto del arranque): usa el font-family del
 * sistema para no quedar invisible si el gate corre antes que useFonts.
 */
export default function UpdateGate({ status }) {
  const copy = COPY[status] ?? COPY[STARTUP_UPDATE_STATUS.CHECKING];

  return (
    <View className="flex-1 items-center justify-center px-8 bg-ui-background-light dark:bg-ui-background-dark">
      <View className="w-20 h-20 rounded-2xl items-center justify-center mb-8 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <CloudUpload
          size={36}
          className="text-brandPrimary-600 dark:text-brandPrimary-400"
        />
      </View>

      <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
        {copy.title}
      </Text>
      <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-10 max-w-[280px]">
        {copy.subtitle}
      </Text>

      <ActivityIndicator size="small" color="#4a44e4" />
    </View>
  );
}
