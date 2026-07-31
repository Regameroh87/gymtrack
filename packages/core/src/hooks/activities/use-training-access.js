// ¿Puede este socio entrar al módulo de entrenamiento (planes, registros,
// progreso) del gym activo?
//
// La política NO vive acá: la decide el RPC member_training_access, para que web
// y móvil no puedan discrepar sobre quién entra. Este hook solo la consulta y
// resuelve las dos cosas que sí son del cliente: qué mostrar mientras no hay
// respuesta, y qué hacer sin conexión.
//
// ── Fail-open mientras no hay veredicto ─────────────────────────────────────
// activity_subscriptions no está en SYNCED_TABLES: el veredicto es online. Si el
// gate bloqueara por defecto, un socio al día que abre la app sin señal se
// quedaría afuera de una app que es offline-first. Sin respuesta → pasa.
//
// ── Pero el "denegado" sí persiste ──────────────────────────────────────────
// Un fail-open puro convierte el modo avión en la forma de saltear el gate. Por
// eso el último veredicto confirmado se cachea: si la última respuesta del
// server fue "no", sigue siendo "no" hasta que el server diga otra cosa.

// React / libs
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

// DB / storage
import { supabase } from "../../supabase.js";
import { storage } from "../../storage.js";

const cacheKey = (gymId) => `training_access:${gymId}`;

// El storage es best-effort: que falle el adapter no puede tumbar el gate.
const readCache = async (gymId) => {
  try {
    const raw = await storage.getItem(cacheKey(gymId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = async (gymId, verdict) => {
  try {
    await storage.setItem(cacheKey(gymId), JSON.stringify(verdict));
  } catch {
    // sin storage disponible se pierde la persistencia offline, nada más
  }
};

export const useTrainingAccess = (gymId) => {
  // undefined = todavía leyendo el cache; null = no había nada cacheado.
  const [cached, setCached] = useState(undefined);

  useEffect(() => {
    let alive = true;
    if (!gymId) {
      setCached(null);
      return;
    }
    setCached(undefined);
    readCache(gymId).then((v) => {
      if (alive) setCached(v);
    });
    return () => {
      alive = false;
    };
  }, [gymId]);

  const query = useQuery({
    queryKey: ["training_access", gymId],
    enabled: !!gymId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_training_access", {
        p_gym_id: gymId,
      });
      if (error) throw error;

      // RETURNS TABLE ⇒ PostgREST devuelve un array de una fila.
      const row = Array.isArray(data) ? data[0] : data;
      const verdict = {
        allowed: row?.allowed !== false,
        reason: row?.reason ?? "unknown",
        activityName: row?.activity_name ?? null,
        dueDate: row?.due_date ?? null,
      };
      await writeCache(gymId, verdict);
      return verdict;
    },
  });

  // Orden: respuesta fresca › último veredicto confirmado › abierto.
  const verdict = query.data ?? (cached || null);

  return {
    allowed: verdict ? verdict.allowed : true,
    // Motivo del RPC: not_gated | staff | not_member | no_training_activity |
    // active | overdue | not_subscribed. 'resolving' es local: todavía no hay
    // ninguna de las dos fuentes.
    reason: verdict?.reason ?? "resolving",
    activityName: verdict?.activityName ?? null,
    dueDate: verdict?.dueDate ?? null,
    // Para no renderizar el cartel de bloqueo en el primer frame de un arranque
    // frío sin cache: no hay dato, todavía no significa nada.
    isResolving: cached === undefined || (!verdict && query.isLoading),
    refetch: query.refetch,
  };
};
