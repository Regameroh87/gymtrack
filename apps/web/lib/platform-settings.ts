// Lectura del kill switch del signup self-service (platform_settings, fila
// única). Corre en el server con el cliente anon público: la policy
// platform_settings_select permite SELECT a anon. El enforcement real vive en
// la edge function crear-gym-self-service; acá solo se decide qué UI mostrar.

import { supabase } from "@/lib/supabase";

export async function getSelfServiceSignupEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("self_service_signup_enabled")
    .maybeSingle();

  if (error) {
    console.error("[platform-settings] error al leer el flag:", error.message);
    return false; // ante la duda, registros cerrados
  }
  return data?.self_service_signup_enabled === true;
}

// Días de prueba del plan por defecto, para textos públicos (landing). Anon
// puede leer saas_plans is_active=true por RLS. Ante error, cae al default
// histórico.
//
// Es el plan default y no "el activo más viejo": es el que efectivamente se le
// asigna al gym que se registra desde la landing, así que es el único trial que
// la landing puede prometer sin mentir.
export async function getPublicTrialDays(): Promise<number> {
  const { data, error } = await supabase
    .from("saas_plans")
    .select("trial_days")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error || data?.trial_days == null) return 14;
  return data.trial_days;
}
