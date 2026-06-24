import { useQuery } from "@tanstack/react-query";

import { storage } from "../../storage.js";
import { sessionDraftPrefix } from "./use-session-draft";

// Escanea el storage en busca de cualquier sesión a medias (draft) y
// devuelve la más reciente. Desacoplado de la pantalla activa para poder
// detectar "sesión en curso" desde cualquier ruta (home, banner global, etc).
// Devuelve null si no hay ningún draft guardado.
export const fetchActiveSessionDraft = async () => {
  const keys = await storage.getAllKeys();
  const draftKeys = keys.filter((k) => k.startsWith(sessionDraftPrefix));
  if (draftKeys.length === 0) return null;

  const entries = await storage.multiGet(draftKeys);
  let latest = null;
  for (const [key, raw] of entries) {
    if (!raw) continue;
    try {
      const saved = JSON.parse(raw);
      const candidate = {
        dayId: key.slice(sessionDraftPrefix.length),
        startedAt: saved.startedAt ?? null,
        completedCount: Array.isArray(saved.completedSets)
          ? saved.completedSets.length
          : 0,
      };
      if (!latest || (candidate.startedAt ?? 0) > (latest.startedAt ?? 0)) {
        latest = candidate;
      }
    } catch {
      // ignora drafts corruptos
    }
  }
  return latest;
};

export const useActiveSessionDraft = () =>
  useQuery({
    queryKey: ["active_session_draft"],
    queryFn: fetchActiveSessionDraft,
    staleTime: 0,
    refetchOnMount: "always",
  });
