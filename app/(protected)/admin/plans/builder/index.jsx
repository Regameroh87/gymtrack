// Contexto
import { usePlanFormContext } from "../../../../../src/contexts/PlanFormContext";

// Componentes
import FormTrainingPlan from "../../../../../src/components/forms/FormTrainingPlan";

export default function PlanBuilder() {
  const { form, planId } = usePlanFormContext();
  return <FormTrainingPlan form={form} plan={planId} />;
}
