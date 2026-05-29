import { useLocalSearchParams } from "expo-router";
import { useStore } from "@tanstack/react-form";

import { usePlanFormContext } from "../../../../../../src/contexts/PlanFormContext";
import FormPlanWeek from "../../../../../../src/components/forms/FormPlanWeek";
import { useCustomSessions } from "../../../../../../src/hooks/useCustomSessions";
import { fetchCustomSessionExercises } from "../../../../../../src/hooks/useCustomSessionExercises";

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
    <FormPlanWeek
      form={form}
      weekNumber={weekNumber}
      weekTitle={weekTitle}
      sessionsHook={useCustomSessions}
      fetchExercisesFn={fetchCustomSessionExercises}
      sessionExercisesQueryKey="custom_session_exercises"
    />
  );
}
