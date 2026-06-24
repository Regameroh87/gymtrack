import { useEffect } from "react";
import { storage } from "../../storage.js";

export default function useAsyncStorage({ form, storageKey, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    const loadDraft = async () => {
      try {
        const saved = await storage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          Object.keys(data).forEach((key) => {
            form.setFieldValue(key, data[key]);
          });
        }
      } catch (error) {
        console.error("Error al cargar el borrador:", error);
      }
    };
    loadDraft();
  }, [form, storageKey, enabled]);

  useEffect(() => {
    if (!enabled || !form) return;

    const unsubscribe = form.store.subscribe(() => {
      try {
        const values = form.state.values;
        storage.setItem(storageKey, JSON.stringify(values));
      } catch (error) {
        console.error("Error al guardar el borrador:", error);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [form, storageKey, enabled]);
}
