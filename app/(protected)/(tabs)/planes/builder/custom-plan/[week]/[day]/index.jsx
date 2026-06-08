import { Platform, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStore } from "@tanstack/react-form";

import { usePlanFormContext } from "../../../../../../../../src/contexts/PlanFormContext";
import DayPrescriptionEditor from "../../../../../../../../src/components/forms/DayPrescriptionEditor";

export default function UserPlanDayPrescription() {
  const { week, day } = useLocalSearchParams();
  const { form } = usePlanFormContext();
  const weekNumber = parseInt(week, 10);
  const dayIdx = parseInt(day, 10);
  const durationWeeks = useStore(
    form.store,
    (s) => s.values.duration_weeks ?? 0
  );
  const weekTitle =
    durationWeeks === 0 ? "Semana tipo" : `Semana ${weekNumber}`;

  return (
    <>
      <View className={`${Platform.OS === "ios" ? "pt-0" : "pt-5"} flex-1`}>
        <DayPrescriptionEditor
          form={form}
          weekNumber={weekNumber}
          dayIdx={dayIdx}
          weekTitle={weekTitle}
          allowAddExercise
        />
      </View>
    </>
  );
}
