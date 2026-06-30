import { Platform, Alert } from "react-native";
import { supabase } from "../../database/supabase";

// Logout seguro para device compartido. El próximo login de otra cuenta dispara el
// guard `ensureDbMatchesAuthUser`, que PURGA el SQLite local para no mezclar datos
// de cuentas distintas: por eso subimos los cambios pendientes ANTES de salir, o se
// perderían (y una fila de la identidad previa podría empujarse bajo la sesión nueva
// y chocar con la RLS). Si hay pendientes y NO hay red, aborta el logout y avisa.
//
// En web no hay SQLite local (se consulta Supabase directo): no hay nada que subir.
//
// Devuelve true si cerró sesión, false si se abortó por pendientes sin conexión.
export async function performLogout() {
  try {
    const sync = Platform.OS === "web" ? null : require("../../database/sync");
    if (sync) await sync.flushPendingBeforeLogout();
  } catch (e) {
    Alert.alert("No se pudo cerrar sesión", e.message);
    return false;
  }

  // scope:'local' limpia la sesión local de inmediato sin esperar respuesta de red;
  // ProtectedLayout redirige a login al detectar isLoggedIn = false.
  await supabase.auth.signOut({ scope: "local" });
  return true;
}
