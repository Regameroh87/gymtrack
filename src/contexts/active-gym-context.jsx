// React
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
import { useQuery } from "@tanstack/react-query";

// Auth y datos
import { useAuth } from "../auth/lib/getSession";
import { supabase } from "../database/supabase";
import { queryClient } from "../lib/queryClient";
import { requestGymSwitch, checkNetInfoAndSync } from "../database/sync";

// ─── Gym activo (multi-gym) ───
// Una persona puede tener memberships en varios gyms (tabla memberships).
// El login autentica a la persona; este contexto resuelve EN QUÉ gym está
// parada la app: con 1 membership entra directo, con varias exige selección
// (pantalla select-gym) y persiste la elección para los próximos arranques.
// El theme, el rol efectivo y el sync local dependen del gym activo.

export const ACTIVE_GYM_KEY = "active-gym:id";

const ActiveGymContext = createContext(null);

export function ActiveGymProvider({ children }) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const authUserId = user?.user_id ?? null;

  const [activeGymId, setActiveGymId] = useState(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const lastSyncedGymRef = useRef(null);

  // Memberships activas con el branding del gym embebido (alcanza para el
  // selector sin queries extra).
  const membershipsQuery = useQuery({
    queryKey: ["memberships", authUserId],
    enabled: !!authUserId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select(
          "id, gym_id, role, status, gyms ( id, name, logo_url, theme_primary, theme_accent )"
        )
        .eq("user_id", authUserId)
        .eq("status", "active");
      if (error) {
        console.error("ActiveGym: error al leer memberships:", error.message);
        throw error;
      }
      return data ?? [];
    },
  });

  const memberships = membershipsQuery.data ?? null;

  // Hidratación temprana del gym persistido (antes de que resuelvan las queries).
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ACTIVE_GYM_KEY)
      .then((stored) => {
        if (mounted && stored) setActiveGymId(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setStorageLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Validación contra memberships: un gym persistido en el que ya no se tiene
  // membership se descarta; con una sola membership se auto-selecciona.
  useEffect(() => {
    if (!storageLoaded || !memberships) return;

    const isValid = (gymId) =>
      !!gymId && memberships.some((m) => m.gym_id === gymId);

    if (isValid(activeGymId)) return;

    if (memberships.length === 1) {
      const only = memberships[0].gym_id;
      setActiveGymId(only);
      AsyncStorage.setItem(ACTIVE_GYM_KEY, only).catch(() => {});
    } else if (activeGymId) {
      // Quedó huérfano (lo sacaron del gym o cambió de cuenta): forzar selección.
      setActiveGymId(null);
      AsyncStorage.removeItem(ACTIVE_GYM_KEY).catch(() => {});
    }
  }, [storageLoaded, memberships, activeGymId]);

  // El sync local solo conoce el gym activo. Cuando éste queda definido (arranque
  // o auto-selección) se dispara un sync; el guard interno purga y re-puebla si
  // la base local pertenecía a otro gym. syncWithSupabase ya es reentrante.
  useEffect(() => {
    if (!activeGymId || !isLoggedIn) return;
    if (lastSyncedGymRef.current === activeGymId) return;
    lastSyncedGymRef.current = activeGymId;
    checkNetInfoAndSync().catch((e) =>
      console.error("ActiveGym: sync post-selección falló:", e)
    );
  }, [activeGymId, isLoggedIn]);

  const switchGym = useCallback(
    async (gymId) => {
      if (gymId === activeGymId) return;
      const target = memberships?.find((m) => m.gym_id === gymId);
      if (!target) {
        throw new Error("No tenés membresía activa en ese gimnasio.");
      }
      // Empuja pendientes del gym actual y purga la base local; tira error
      // claro si hay cambios sin subir y no hay conexión.
      await requestGymSwitch(gymId);
      lastSyncedGymRef.current = gymId;
      setActiveGymId(gymId);
      // Todo lo cacheado pertenece al gym anterior.
      queryClient.invalidateQueries();
    },
    [activeGymId, memberships]
  );

  const activeMembership = useMemo(
    () => memberships?.find((m) => m.gym_id === activeGymId) ?? null,
    [memberships, activeGymId]
  );

  const needsSelection =
    isLoggedIn &&
    !!memberships &&
    memberships.length > 1 &&
    !activeMembership;

  const value = useMemo(
    () => ({
      gymId: activeMembership?.gym_id ?? null,
      // Rol efectivo en el gym activo. Fallback a profiles.role mientras las
      // memberships cargan (transición; mismo valor para usuarios de 1 gym).
      role: user?.is_super_admin
        ? "super_admin"
        : (activeMembership?.role ?? user?.role ?? null),
      gym: activeMembership?.gyms ?? null,
      memberships: memberships ?? [],
      needsSelection,
      switchGym,
      loading:
        authLoading ||
        !storageLoaded ||
        (!!authUserId && membershipsQuery.isLoading),
    }),
    [
      activeMembership,
      memberships,
      needsSelection,
      switchGym,
      user,
      authLoading,
      storageLoaded,
      authUserId,
      membershipsQuery.isLoading,
    ]
  );

  return (
    <ActiveGymContext.Provider value={value}>
      {children}
    </ActiveGymContext.Provider>
  );
}

export function useActiveGym() {
  const ctx = useContext(ActiveGymContext);
  if (!ctx) {
    throw new Error("useActiveGym debe usarse dentro de <ActiveGymProvider>");
  }
  return ctx;
}
