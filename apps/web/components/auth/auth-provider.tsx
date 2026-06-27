"use client";

// Contexto de sesión del lado cliente. Espeja la API de useAuth() de Expo para
// que las pantallas migradas no cambien. Los datos iniciales (perfil) vienen
// resueltos del servidor (getServerSession) y se siembran acá; el browser client
// solo escucha cambios de sesión (logout en otra pestaña → refresca el server).

// React
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// Supabase, acciones y tipos
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { setActiveGym } from "@/lib/auth/actions";
import { type Profile } from "@/lib/auth/session";

interface AuthContextValue {
  user: Profile | null; // registro de profiles
  userId: string | null; // profiles.id (PK interna)
  authUserId: string | null; // auth.uid() = profiles.user_id
  isLoggedIn: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialProfile,
  initialAuthUserId,
  children,
}: {
  initialProfile: Profile | null;
  initialAuthUserId: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(initialProfile);

  // Escucha cambios de sesión: logout/login (incluida otra pestaña) → re-render
  // del server con la sesión nueva, que vuelve a sembrar estos providers.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const refreshProfile = useCallback(async () => {
    if (!initialAuthUserId) return;
    const supabase = getBrowserSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", initialAuthUserId)
      .maybeSingle();
    setUser((data as Profile) ?? null);
  }, [initialAuthUserId]);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    // scope:'local' elimina las cookies de auth de inmediato sin hacer POST a
    // /auth/v1/logout (la variante global espera respuesta de red antes de limpiar,
    // introduciendo 500ms–2s de latencia visible antes de la navegación).
    await supabase.auth.signOut({ scope: "local" });
    // La cookie del gym no bloquea la navegación; se borra en background.
    setActiveGym(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userId: (user?.id as string) ?? null,
      authUserId: initialAuthUserId,
      isLoggedIn: !!initialAuthUserId,
      loading: false, // el server ya resolvió la sesión antes de renderizar
      refreshProfile,
      signOut,
    }),
    [user, initialAuthUserId, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
