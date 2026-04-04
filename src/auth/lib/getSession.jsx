import { useState, useEffect } from "react";
import { supabase } from "../../database/supabase.js"; // Ajusta la ruta a tu archivo de supabase

export const useAuth = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión inicial del almacenamiento (AsyncStorage interno)
    const initializeAuth = async () => {
      try {
        //console.log("useAuth: Llamando a getSession()...");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        /*  console.log(
          "useAuth: getSession() completado. Sesión encontrada:",
          !!session
        ); */
        if (session) {
          setSession(session);
          const user = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id);
          //console.log("user", user.data[0]);
          setUser(user.data[0]);
        }
      } catch (error) {
        console.error("useAuth: Error al obtener la sesión inicial:", error);
      } finally {
        //console.log("useAuth: Finalizando carga (setLoading false)");
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escuchar cambios automáticos (Login, Logout, Refresh Token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      //console.log("useAuth: onAuthStateChange disparado:", _event);

      // Solo actualizamos si la sesión realmente cambió para evitar bucles de renderizado
      setSession((currentSession) => {
        if (currentSession?.access_token === newSession?.access_token) {
          return currentSession;
        }
        return newSession;
      });

      setUser((currentUser) => {
        if (currentUser?.id === newSession?.user?.id) {
          return currentUser;
        }
        return newSession?.user ?? null;
      });

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user,
    userId: user?.id, // Acceso directo al ID para WatermelonDB
    loading,
    isLoggedIn: !!session,
  };
};
