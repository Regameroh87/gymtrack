// React Native
import { Platform, Alert } from "react-native";

// BD
import { supabase } from "../../database/supabase";

// Logout seguro para device compartido. El próximo login de otra cuenta dispara el
// guard `ensureDbMatchesAuthUser`, que PURGA el SQLite local para no mezclar datos
// de cuentas distintas: por eso subimos los cambios pendientes ANTES de salir, o se
// perderían (y una fila de la identidad previa podría empujarse bajo la sesión nueva
// y chocar con la RLS). Si hay pendientes y NO se pueden subir (sin red, o un push
// que falla siempre), se ofrece una salida forzada que descarta lo local y sale, así
// el usuario nunca queda bloqueado.
//
// En web no hay SQLite local (se consulta Supabase directo): no hay nada que subir.
//
// Devuelve true si cerró sesión, false si se abortó.
export async function performLogout() {
  try {
    const sync = Platform.OS === "web" ? null : require("../../database/sync");
    if (sync) await sync.flushPendingBeforeLogout();
  } catch (e) {
    // No se pudieron subir los pendientes: en vez de bloquear, ofrecemos salir
    // descartando los cambios locales no sincronizados.
    return await promptForceLogout(e.message);
  }

  await signOutLocal();
  return true;
}

// Cierra sesión descartando el contenido local no sincronizado. Purga las tablas
// sincronizadas + marcadores de gym/auth (wipeLocalData): el próximo login hace un
// full pull limpio desde el server; solo se pierden las ediciones locales que no
// habían llegado a subir (justo lo que se descarta).
export async function forceLogout() {
  if (Platform.OS !== "web") {
    const sync = require("../../database/sync");
    await sync.wipeLocalData();
  }
  await signOutLocal();
  return true;
}

// scope:'local' limpia la sesión local de inmediato sin esperar respuesta de red;
// ProtectedLayout redirige a login al detectar isLoggedIn = false.
async function signOutLocal() {
  await supabase.auth.signOut({ scope: "local" });
}

// Diálogo de escape: avisa qué quedó sin subir y ofrece cerrar sesión de todos
// modos (descartando). Resuelve true si el usuario forzó la salida, false si canceló.
function promptForceLogout(detail) {
  const message = `${detail}\n\nSi cerrás sesión de todos modos, esos cambios se descartarán.`;

  if (Platform.OS === "web") {
    if (window.confirm(`${message}\n\n¿Cerrar sesión de todos modos?`)) {
      return forceLogout();
    }
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    Alert.alert("Cambios sin sincronizar", message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      {
        text: "Cerrar sesión de todos modos",
        style: "destructive",
        onPress: async () => {
          await forceLogout();
          resolve(true);
        },
      },
    ]);
  });
}
