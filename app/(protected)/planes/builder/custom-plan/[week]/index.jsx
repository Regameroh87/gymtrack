// Librerías externas
import { Stack, useLocalSearchParams } from "expo-router";
import { useStore } from "@tanstack/react-form";

// Contexto
import { usePlanFormContext } from "../../../../../../src/contexts/PlanFormContext";

// Componentes
import FormPlanWeek from "../../../../../../src/components/forms/FormPlanWeek";

export default function UserPlanWeekEditor() {
  const { week } = useLocalSearchParams();
  const { form } = usePlanFormContext();
  const weekNumber = parseInt(week, 10);
  const durationWeeks = useStore(
    form.store,
    (s) => s.values.duration_weeks ?? 0
  );
  const weekTitle =
    durationWeeks === 0 ? "Semana tipo" : `Semana ${weekNumber}`;

  return (
    <>
      <FormPlanWeek form={form} weekNumber={weekNumber} weekTitle={weekTitle} />
    </>
  );
}
