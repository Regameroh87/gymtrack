import { useState, useEffect, useRef } from "react";
import { supabase } from "../../database/supabase.js"; // Ajusta la ruta a tu archivo de supabase

export const useAuth = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const accessTokenRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Identidad canónica: profiles.user_id = auth.uid(). profiles.id es la PK
    // interna (target de FK en session_logs.user_id, plan_assignments.user_id),
    // por eso se busca por user_id y se expone profiles.id como userId.
    const fetchProfile = async (authUserId) => {
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
    };

    // Sincroniza session + perfil para una sesión dada (init o cambio de auth).
    const applySession = async (newSession) => {
      accessTokenRef.current = newSession?.access_token ?? null;
      setSession(newSession ?? null);
      if (!newSession) {
        setUser(null);
        return;
      }
      const profile = await fetchProfile(newSession.user.id);
      if (isMounted) setUser(profile);
    };

    // 1. Obtener sesión inicial del almacenamiento (AsyncStorage interno)
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

    // 2. Escuchar cambios automáticos (Login, Logout, Refresh Token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Solo recargamos si el token realmente cambió, para evitar bucles de render.
      if (accessTokenRef.current === (newSession?.access_token ?? null)) return;
      applySession(newSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    userId: user?.id,
    loading,
    isLoggedIn: !!session,
  };
};
