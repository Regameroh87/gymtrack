import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

export default function useAsyncStorage({ form, storageKey }) {
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          Object.keys(data).forEach((key) => {
            form.setFieldValue(key, data[key]);
          });
          //console.log("Borrador cargado exitosamente", form.state.values);
        }
      } catch (error) {
        console.error("Error al cargar el borrador:", error);
      }
    };
    loadDraft();
  }, [form, storageKey]);

  useEffect(() => {
    if (!form) return;

    const unsubscribe = form.store.subscribe(() => {
      try {
        const values = form.state.values;
        AsyncStorage.setItem(storageKey, JSON.stringify(values));
      } catch (error) {
        console.error("Error al guardar el borrador:", error);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [form, storageKey]);
}
