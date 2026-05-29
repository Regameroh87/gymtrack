import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const sessionDraftPrefix = "gymtrack:session_draft:";
export const sessionDraftKey = (dayId) => `${sessionDraftPrefix}${dayId}`;
const draftKey = sessionDraftKey;

export function useSessionDraft(dayId) {
  const [startedAt, setStartedAt] = useState(null); // ms timestamp, base del timer de pared
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(new Set());
  const [setData, setSetData] = useState({});
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    if (!dayId) {
      setStartedAt(Date.now());
      setIsRestored(true);
      return;
    }
    AsyncStorage.getItem(draftKey(dayId)).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setStartedAt(saved.startedAt ?? Date.now());
          if (saved.currentIdx != null) setCurrentIdx(saved.currentIdx);
          if (saved.completedSets) setCompletedSets(new Set(saved.completedSets));
          if (saved.setData) setSetData(saved.setData);
        } catch {
          setStartedAt(Date.now());
        }
      } else {
        setStartedAt(Date.now());
      }
      setIsRestored(true);
    });
  }, [dayId]);

  useEffect(() => {
    if (!dayId || !isRestored || !startedAt) return;
    AsyncStorage.setItem(
      draftKey(dayId),
      JSON.stringify({
        startedAt,
        currentIdx,
        completedSets: [...completedSets],
        setData,
      })
    );
  }, [dayId, isRestored, startedAt, currentIdx, completedSets, setData]);

  const clearDraft = useCallback(() => {
    if (dayId) return AsyncStorage.removeItem(draftKey(dayId));
    return Promise.resolve();
  }, [dayId]);

  const updateField = useCallback((exId, setId, field, value) => {
    const k = `${exId}-${setId}`;
    setSetData((prev) => ({ ...prev, [k]: { ...prev[k], [field]: value } }));
  }, []);

  return {
    startedAt,
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
