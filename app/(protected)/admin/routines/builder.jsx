import { useRoutineForm } from "../../../../src/hooks/useRoutineForm";
import FormRoutine from "../../../../src/components/forms/FormRoutine";

export default function RoutineBuilder() {
  const form = useRoutineForm();
  return <FormRoutine form={form} />;
}
