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
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

// Auth y datos
import { useAuth } from "../auth/lib/getSession";
import { supabase } from "../database/supabase";
import { queryClient } from "../lib/queryClient";

// El motor de sync escribe en SQLite local, que solo existe en native (la web
// consulta Supabase directo). Carga diferida para no inicializar expo-sqlite
// en el bundle web al importar este contexto.
const loadSync = () =>
  Platform.OS === "web" ? null : require("../database/sync");

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
  // Flag global de la persona (no depende del gym activo). Habilita el "modo
  // administrador": entrar a CUALQUIER gym para inspeccionarlo, aunque no tenga
  // membership. Las RLS ya dan bypass de lectura al super_admin.
  const isSuperAdmin = !!user?.is_super_admin;

  const [activeGymId, setActiveGymId] = useState(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const lastSyncedGymRef = useRef(null);
  const prevAuthUserIdRef = useRef(null);
  const didWipeNoGymRef = useRef(false);

  // Memberships activas con el branding del gym embebido (alcanza para el
  // selector sin queries extra).
  const membershipsQuery = useQuery({
    queryKey: ["memberships", authUserId],
    enabled: !!authUserId,
    staleTime: 1000 * 60 * 5,
    // Red de seguridad para detectar una suspensión del gym aunque la app quede
    // abierta en foreground sin backgroundear ni perder red. Es una query mínima
    // (memberships del usuario); no corre en background.
    refetchInterval: 1000 * 60 * 2,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select(
          "id, gym_id, role, status, gyms ( id, name, logo_url, theme_primary, theme_accent, is_active )"
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

  // Confirmación POSITIVA del servidor de que la persona no tiene ninguna
  // membership (su gym fue eliminado o la sacaron de todos): la query cargó con
  // éxito y vino vacía. Si está offline / erroró / nunca corrió, es false, para
  // no bloquear el uso offline-first con datos locales.
  const confirmedNoGym =
    membershipsQuery.isSuccess && (membershipsQuery.data?.length ?? 0) === 0;

  // Modo administrador: el super_admin puede entrar a cualquier gym, así que el
  // selector se alimenta del catálogo COMPLETO de gyms (no de sus memberships).
  // La RLS gyms_select ya permite al super_admin leer todos. El catálogo cambia
  // poco, por eso un staleTime alto.
  const allGymsQuery = useQuery({
    queryKey: ["all-gyms", authUserId],
    enabled: !!authUserId && isSuperAdmin,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("id, name, logo_url, theme_primary, theme_accent, is_active")
        .order("name");
      if (error) {
        console.error(
          "ActiveGym: error al leer todos los gyms:",
          error.message
        );
        throw error;
      }
      return data ?? [];
    },
  });

  const allGyms = allGymsQuery.data ?? null;

  // Un gym suspendido (gyms.is_active=false) se trata como si la persona ya no
  // tuviera acceso a él: las RLS ya cortan sus datos en el servidor; acá lo
  // sacamos del selector y de la validación del gym activo. La membership sigue
  // 'active' (no se toca), pero el gym no es "usable".
  const usableMemberships = useMemo(
    () =>
      memberships
        ? memberships.filter((m) => m.gyms?.is_active !== false)
        : null,
    [memberships]
  );

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

  // Logout: al perder la sesión se limpia el gym activo (estado + storage) para
  // que la próxima cuenta arranque sin gym persistido; un owner con >1 gym vuelve
  // a elegir. Solo en la transición usuario→null: en el arranque con sesión
  // persistida (prev=null) no toca el storage, así se preserva la elección.
  useEffect(() => {
    const prev = prevAuthUserIdRef.current;
    prevAuthUserIdRef.current = authUserId;
    if (prev && !authUserId) {
      setActiveGymId(null);
      AsyncStorage.removeItem(ACTIVE_GYM_KEY).catch(() => {});
      // Permite que una próxima cuenta sin gym vuelva a purgar (device compartido).
      didWipeNoGymRef.current = false;
    }
  }, [authUserId]);

  // Validación contra memberships usables: un gym persistido en el que ya no se
  // tiene membership —o que fue suspendido— se descarta; con una sola membership
  // usable se auto-selecciona.
  // El super_admin queda exento: siempre elige explícitamente desde el selector
  // (su "home base"), así que ni se auto-selecciona ni se invalida su elección
  // contra memberships (puede estar parado en un gym donde no tiene membership).
  useEffect(() => {
    if (isSuperAdmin) return;
    if (!storageLoaded || !usableMemberships) return;

    const isValid = (gymId) =>
      !!gymId && usableMemberships.some((m) => m.gym_id === gymId);

    if (isValid(activeGymId)) return;

    if (usableMemberships.length === 1) {
      const only = usableMemberships[0].gym_id;
      setActiveGymId(only);
      AsyncStorage.setItem(ACTIVE_GYM_KEY, only).catch(() => {});
    } else if (activeGymId) {
      // Quedó huérfano (lo sacaron del gym, cambió de cuenta o el gym fue
      // suspendido): forzar selección del resto.
      setActiveGymId(null);
      AsyncStorage.removeItem(ACTIVE_GYM_KEY).catch(() => {});
    }
  }, [isSuperAdmin, storageLoaded, usableMemberships, activeGymId]);

  // Suspensión del gimnasio: si la persona tenía memberships pero ninguna quedó
  // usable (su único gym fue suspendido, o todos), se cierra la sesión. Si le
  // quedan otros gyms activos, el efecto de validación de arriba la reubica sin
  // desloguear.
  useEffect(() => {
    if (isSuperAdmin) return; // el super_admin tiene su propio selector, no se expulsa
    if (!isLoggedIn || !memberships || !usableMemberships) return;
    if (memberships.length > 0 && usableMemberships.length === 0) {
      supabase.auth.signOut().catch(() => {});
    }
  }, [isSuperAdmin, isLoggedIn, memberships, usableMemberships]);

  // Sin ninguna membership (confirmado online): el gym fue eliminado o la sacaron
  // de todos. Se purga la base local (datos del gym que ya no existe) y se cierra
  // sesión. No corre offline (confirmedNoGym es false) ni para el super_admin.
  useEffect(() => {
    if (isSuperAdmin) return;
    if (!confirmedNoGym) return;
    if (didWipeNoGymRef.current) return;
    didWipeNoGymRef.current = true;
    (async () => {
      const sync = loadSync(); // null en web: no hay SQLite local que purgar
      try {
        if (sync) await sync.wipeLocalData();
      } catch (e) {
        console.error("ActiveGym: purga local tras quedar sin gym falló:", e);
      }
      await supabase.auth.signOut().catch(() => {});
    })();
  }, [isSuperAdmin, confirmedNoGym]);

  // El sync local solo conoce el gym activo. Cuando éste queda definido (arranque
  // o auto-selección) se dispara un sync; el guard interno purga y re-puebla si
  // la base local pertenecía a otro gym. syncWithSupabase ya es reentrante.
  useEffect(() => {
    if (!activeGymId || !isLoggedIn) return;
    if (lastSyncedGymRef.current === activeGymId) return;
    lastSyncedGymRef.current = activeGymId;
    const sync = loadSync();
    if (!sync) return;
    sync
      .checkNetInfoAndSync()
      .catch((e) => console.error("ActiveGym: sync post-selección falló:", e));
  }, [activeGymId, isLoggedIn]);

  const switchGym = useCallback(
    async (gymId) => {
      if (gymId === activeGymId) return;
      // El super_admin valida contra el catálogo completo (puede entrar a
      // cualquier gym); el resto, contra sus memberships usables.
      const target = isSuperAdmin
        ? allGyms?.find((g) => g.id === gymId)
        : usableMemberships?.find((m) => m.gym_id === gymId);
      if (!target) {
        throw new Error(
          isSuperAdmin
            ? "No se encontró ese gimnasio."
            : "No tenés membresía activa en ese gimnasio."
        );
      }
      // Native: empuja pendientes del gym actual y purga la base local; tira
      // error claro si hay cambios sin subir y no hay conexión. Web: no hay
      // base local, alcanza con persistir el gym elegido.
      const sync = loadSync();
      if (sync) {
        await sync.requestGymSwitch(gymId);
      } else {
        await AsyncStorage.setItem(ACTIVE_GYM_KEY, gymId);
      }
      lastSyncedGymRef.current = gymId;
      setActiveGymId(gymId);
      // Todo lo cacheado pertenece al gym anterior.
      queryClient.invalidateQueries();
    },
    [activeGymId, isSuperAdmin, allGyms, usableMemberships]
  );

  // Refresca la fuente del selector bajo demanda (pull-to-refresh en select-gym):
  // el super_admin lista el catálogo completo (all-gyms), el resto sus memberships.
  // Útil cuando se creó un gym en otro cliente/web y el cache local quedó viejo.
  const refetch = useCallback(
    () => (isSuperAdmin ? allGymsQuery.refetch() : membershipsQuery.refetch()),
    [isSuperAdmin, allGymsQuery, membershipsQuery]
  );

  // Volver al selector sin desloguear: limpia el gym activo (estado + storage).
  // Pensado para el super_admin que salta entre gyms. needsSelection pasa a true
  // y el layout redirige al selector. No toca la sesión de auth.
  const exitGym = useCallback(() => {
    lastSyncedGymRef.current = null;
    setActiveGymId(null);
    AsyncStorage.removeItem(ACTIVE_GYM_KEY).catch(() => {});
  }, []);

  const activeMembership = useMemo(
    () => usableMemberships?.find((m) => m.gym_id === activeGymId) ?? null,
    [usableMemberships, activeGymId]
  );

  // Gym activo del super_admin cuando no tiene membership en él: se resuelve
  // desde el catálogo completo. Da el branding/id al resto de la app (useGym,
  // theme) sin depender de memberships.
  const activeAdminGym = useMemo(
    () =>
      isSuperAdmin && activeGymId
        ? (allGyms?.find((g) => g.id === activeGymId) ?? null)
        : null,
    [isSuperAdmin, activeGymId, allGyms]
  );

  const resolvedGymId = activeMembership?.gym_id ?? activeAdminGym?.id ?? null;
  const resolvedGym = activeMembership?.gyms ?? activeAdminGym ?? null;

  // Opciones del selector: el super_admin elige sobre TODOS los gyms; el resto,
  // sobre sus memberships usables. Forma unificada para select-gym.
  const gymOptions = useMemo(() => {
    if (isSuperAdmin) {
      return (allGyms ?? []).map((g) => ({
        key: g.id,
        gym_id: g.id,
        role: "super_admin",
        gym: g,
      }));
    }
    return (usableMemberships ?? []).map((m) => ({
      key: m.id,
      gym_id: m.gym_id,
      role: m.role,
      gym: m.gyms,
    }));
  }, [isSuperAdmin, allGyms, usableMemberships]);

  // En WEB el super_admin NO se fuerza al selector: su "home base" es el panel
  // de plataforma (lista de gyms + configuración), no un gym puntual; entra a un
  // gym explícitamente desde ahí. En NATIVE no hay panel de plataforma, así que
  // sigue pasando por el selector (modo administrador). El resto, solo con >1
  // membership.
  const needsSelection = isSuperAdmin
    ? Platform.OS !== "web" && isLoggedIn && !activeGymId
    : isLoggedIn &&
      !!usableMemberships &&
      usableMemberships.length > 1 &&
      !activeMembership;

  const value = useMemo(
    () => ({
      gymId: resolvedGymId,
      // Rol efectivo en el gym activo (memberships.role); el flag global
      // super_admin pisa al rol local.
      role: isSuperAdmin ? "super_admin" : (activeMembership?.role ?? null),
      gym: resolvedGym,
      memberships: usableMemberships ?? [],
      // Opciones para el selector (super_admin → todos los gyms; resto → memberships).
      gymOptions,
      isSuperAdmin,
      needsSelection,
      confirmedNoGym,
      switchGym,
      // Volver al selector sin desloguear (modo administrador).
      exitGym,
      // Refresco manual del selector (pull-to-refresh).
      refetch,
      loading:
        authLoading ||
        !storageLoaded ||
        (!!authUserId && membershipsQuery.isLoading) ||
        (isSuperAdmin && allGymsQuery.isLoading),
    }),
    [
      resolvedGymId,
      resolvedGym,
      activeMembership,
      usableMemberships,
      gymOptions,
      isSuperAdmin,
      needsSelection,
      confirmedNoGym,
      switchGym,
      exitGym,
      refetch,
      authLoading,
      storageLoaded,
      authUserId,
      membershipsQuery.isLoading,
      allGymsQuery.isLoading,
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
