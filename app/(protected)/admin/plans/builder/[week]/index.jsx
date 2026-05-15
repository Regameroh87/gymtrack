// Librerías externas
import { useLocalSearchParams } from "expo-router";

// Contexto
import { usePlanFormContext } from "../../../../../../src/contexts/PlanFormContext";

// Componentes
import FormPlanWeek from "../../../../../../src/components/forms/FormPlanWeek";

export default function PlanWeekEditor() {
  const { week } = useLocalSearchParams();
  const { form } = usePlanFormContext();
  const weekNumber = parseInt(week, 10);
  return <FormPlanWeek form={form} weekNumber={weekNumber} />;
}
