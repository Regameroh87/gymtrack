import { useEffect, useState } from "react";
import * as Updates from "expo-updates";

// Techo total para el gate de update. Si no hay red, el server tarda, o la
// descarga se cuelga, el arranque NO puede quedar bloqueado esperando: pasado
// este tiempo dejamos entrar a la app con el bundle ya instalado. La descarga
// que haya quedado a mitad se aplicará en el próximo arranque (comportamiento
// default de expo-updates), sin perder nada.
const UPDATE_TIMEOUT_MS = 8_000;

// Fases del gate. La app se muestra recién cuando llega a "done"; si hay update
// se dispara reloadAsync (reinicia el proceso) y este hook nunca llega a "done"
// en esta corrida — lo hace en la siguiente, ya sin update pendiente.
export const STARTUP_UPDATE_STATUS = {
  CHECKING: "checking",
  DOWNLOADING: "downloading",
  DONE: "done",
};

/**
 * Gate de actualización OTA en el arranque (cold start).
 *
 * En cada arranque busca un update en el canal; si hay, lo descarga y recarga
 * el bundle ANTES de mostrar la app, de modo que el usuario siempre entra con
 * la última versión (en vez del default de expo-updates, que aplica recién en
 * el arranque siguiente → "el cambio no aparece hasta reabrir dos veces").
 *
 * Inactivo en dev / Expo Go (Updates.isEnabled === false): resuelve a "done"
 * de inmediato para no bloquear el desarrollo con expo start.
 */
export function useStartupUpdate() {
  const [status, setStatus] = useState(
    __DEV__ || !Updates.isEnabled
      ? STARTUP_UPDATE_STATUS.DONE
      : STARTUP_UPDATE_STATUS.CHECKING
  );

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;
    // Red de seguridad: si el flujo no resuelve dentro del techo, abrimos la
    // app igual. `settled` evita que el timeout pise a un reloadAsync ya en
    // curso o degrade el status tras terminar.
    let settled = false;
    const finish = () => {
      if (settled || cancelled) return;
      settled = true;
      setStatus(STARTUP_UPDATE_STATUS.DONE);
    };

    const timeout = setTimeout(finish, UPDATE_TIMEOUT_MS);

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (cancelled || settled) return;
        if (!check.isAvailable) return finish();

        setStatus(STARTUP_UPDATE_STATUS.DOWNLOADING);
        await Updates.fetchUpdateAsync();
        if (cancelled || settled) return;
        // Reinicia el proceso con el nuevo bundle. No hay código después: el
        // hook vuelve a montar en el arranque siguiente y ahí sí cae a "done".
        await Updates.reloadAsync();
      } catch {
        // Sin red, error del server o descarga fallida: seguimos con el bundle
        // actual. No es un estado de error para el usuario, es "estás al día
        // con lo que tenés".
        finish();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return status;
}
