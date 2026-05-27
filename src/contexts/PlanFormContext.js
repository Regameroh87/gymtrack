import { createContext, useContext } from "react";

const PlanFormContext = createContext(null);

export const PlanFormProvider = PlanFormContext.Provider;

export const usePlanFormContext = () => {
  const ctx = useContext(PlanFormContext);
  if (!ctx) {
    throw new Error(
      "usePlanFormContext debe usarse dentro de un PlanFormProvider"
    );
  }
  return ctx;
};
