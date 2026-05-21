import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const draftKey = (dayId) => `gymtrack:session_draft:${dayId}`;

export function useSessionDraft(dayId) {
  const [elapsed, setElapsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(new Set());
  const [setData, setSetData] = useState({});
  const [isRestored, setIsRestored] = useState(false);

  // Rehydrate from storage once dayId is available
  useEffect(() => {
    if (!dayId) {
      setIsRestored(true);
      return;
    }
    AsyncStorage.getItem(draftKey(dayId)).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved.elapsed != null) setElapsed(saved.elapsed);
          if (saved.currentIdx != null) setCurrentIdx(saved.currentIdx);
          if (saved.completedSets) setCompletedSets(new Set(saved.completedSets));
          if (saved.setData) setSetData(saved.setData);
        } catch {}
      }
      setIsRestored(true);
    });
  }, [dayId]);

  // Auto-save on every change (only after initial restore to avoid overwriting with defaults)
  useEffect(() => {
    if (!dayId || !isRestored) return;
    AsyncStorage.setItem(
      draftKey(dayId),
      JSON.stringify({
        elapsed,
        currentIdx,
        completedSets: [...completedSets],
        setData,
      })
    );
  }, [dayId, isRestored, elapsed, currentIdx, completedSets, setData]);

  const clearDraft = useCallback(() => {
    if (dayId) AsyncStorage.removeItem(draftKey(dayId));
  }, [dayId]);

  function updateField(exId, setId, field, value) {
    const k = `${exId}-${setId}`;
    setSetData((prev) => ({ ...prev, [k]: { ...prev[k], [field]: value } }));
  }

  return {
    elapsed,
    setElapsed,
    currentIdx,
    setCurrentIdx,
    completedSets,
    setCompletedSets,
    setData,
    updateField,
    clearDraft,
    isRestored,
  };
}
