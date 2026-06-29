import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../database/supabase.js";
import { devSignIn } from "./dev-login.js";

// Replica la lógica de SupabaseClient.ts:
// `sb-${baseUrl.hostname.split('.')[0]}-auth-token`
const _ref = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "")
  .replace(/^https?:\/\//, "")
  .split(".")[0];
const SUPABASE_STORAGE_KEY = `sb-${_ref}-auth-token`;

// Una sola suscripción onAuthStateChange para toda la app.
// Expone refreshProfile() para recargar el perfil tras un self-update sin
// esperar a que cambie el token (ej: pantalla de perfil propio).
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const accessTokenRef = useRef(null);
  const authUserIdRef = useRef(null);

  // Identidad canónica: profiles.user_id = auth.uid(). profiles.id es la PK
  // interna (target de FK en session_logs.user_id, plan_assignments.user_id),
  // por eso se busca por user_id y se expone profiles.id como userId.
  const fetchProfile = useCallback(async (authUserId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUserId)
      .maybeSingle();
    if (error) {
      console.error("useAuth: Error al obtener el perfil:", error);
      return null;
    }
    return data;
  }, []);

  // Recarga el perfil del usuario autenticado actual. Llamar después de
  // guardar datos propios para que todos los consumers (home avatar, etc.)
  // vean los datos actualizados sin esperar un cambio de token.
  const refreshProfile = useCallback(async () => {
    const uid = authUserIdRef.current;
    if (!uid) return;
    const profile = await fetchProfile(uid);
    setUser(profile);
  }, [fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (newSession) => {
      accessTokenRef.current = newSession?.access_token ?? null;
      authUserIdRef.current = newSession?.user?.id ?? null;
      setSession(newSession ?? null);
      if (!newSession) {
        setUser(null);
        return;
      }
      const profile = await fetchProfile(newSession.user.id);
      if (isMounted) setUser(profile);
    };

    // Lectura directa de AsyncStorage (~20ms, sin red): libera loading antes de
    // que Supabase valide o refresque el token. El cliente Supabase bloquea en
    // _callRefreshToken (hasta 30s de backoff) cuando el JWT expiró; leyendo
    // directamente la sesión almacenada evitamos ese cuello de botella.
    AsyncStorage.getItem(SUPABASE_STORAGE_KEY)
      .then((raw) => {
        if (!isMounted) return;
        if (raw) {
          try {
            const stored = JSON.parse(raw);
            if (stored?.access_token && stored?.user?.id) {
              const isExpired =
                !stored.expires_at || stored.expires_at * 1000 <= Date.now();
              accessTokenRef.current = stored.access_token;
              authUserIdRef.current = stored.user.id;
              setSession(stored);
              if (!isExpired) {
                // Profile en background — no bloquea el render inicial
                fetchProfile(stored.user.id).then((profile) => {
                  if (isMounted) setUser(profile);
                });
              }
              // Si venció: onAuthStateChange (TOKEN_REFRESHED) trae el token
              // fresco y applySession() carga el perfil en ese momento.
            }
          } catch {
            // JSON inválido → sin sesión
          }
        } else if (__DEV__ && process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN) {
          devSignIn(process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN).catch((err) =>
            console.error("Dev auto-login:", err.message)
          );
        }
        if (isMounted) setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // Supabase valida y refresca el JWT en background. Cuando termina llega
    // TOKEN_REFRESHED (token actualizado) o SIGNED_OUT (refresh falló →
    // redirect login). El guard evita re-aplicar si el token no cambió.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (accessTokenRef.current === (newSession?.access_token ?? null)) return;
      await applySession(newSession);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      userId: user?.id,
      loading,
      isLoggedIn: !!session,
      refreshProfile,
    }),
    [session, user, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
};
