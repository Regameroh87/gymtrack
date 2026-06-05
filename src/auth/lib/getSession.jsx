import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { supabase } from "../../database/supabase.js";

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

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) await applySession(session);
      } catch (error) {
        console.error("useAuth: Error al obtener la sesión inicial:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (accessTokenRef.current === (newSession?.access_token ?? null)) return;
      applySession(newSession);
      setLoading(false);
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
