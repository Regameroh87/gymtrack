import { Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStore } from "@tanstack/react-form";

import { usePlanFormContext } from "../../../../../../../src/contexts/PlanFormContext";
import FormPlanWeek from "../../../../../../../src/components/forms/FormPlanWeek";
import Screen from "../../../../../../../src/components/Screen";
import { useAllSessions } from "../../../../../../../src/hooks/sessions/use-all-sessions";
import { fetchCustomSessionExercises } from "../../../../../../../src/hooks/sessions/use-custom-session-exercises";
import { fetchSessionExercises } from "../../../../../../../src/hooks/sessions/use-session-exercises";

const fetchExercisesFnMap = {
  gym: fetchSessionExercises,
  custom: fetchCustomSessionExercises,
};

export default function UserPlanWeekEditor() {
  const { week } = useLocalSearchParams();
  const { form, planId } = usePlanFormContext();
  const weekNumber = parseInt(week, 10);
  const durationWeeks = useStore(
    form.store,
    (s) => s.values.duration_weeks ?? 0
  );
  const weekTitle =
    durationWeeks === 0 ? "Semana tipo" : `Semana ${weekNumber}`;

  return (
    <Screen safe={Platform.OS === "android"}>
      <FormPlanWeek
        form={form}
        weekNumber={weekNumber}
        weekTitle={weekTitle}
        sessionsHook={useAllSessions}
        fetchExercisesFnMap={fetchExercisesFnMap}
        planId={planId}
        prescriptionPathname="/planes/builder/custom-plan/[week]/[day]"
      />
    </Screen>
  );
}
