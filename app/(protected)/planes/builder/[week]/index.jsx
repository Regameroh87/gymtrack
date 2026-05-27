import { useLocalSearchParams } from "expo-router";

import { usePlanFormContext } from "../../../../../src/contexts/PlanFormContext";
import FormPlanWeek from "../../../../../src/components/forms/FormPlanWeek";

export default function UserPlanWeekEditor() {
  const { week } = useLocalSearchParams();
  const { form } = usePlanFormContext();
  const weekNumber = parseInt(week, 10);

  return <FormPlanWeek form={form} weekNumber={weekNumber} />;
}
