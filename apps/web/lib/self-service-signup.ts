// Helpers cliente del signup self-service: el borrador (nombre del gym + del
// owner) viaja por sessionStorage entre /registro y /registro/verificar, y la
// creación real la hace la edge function crear-gym-self-service con el JWT de
// la sesión recién verificada.

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { readFunctionError } from "@/lib/gyms";

const SIGNUP_DRAFT_KEY = "gymtrack-signup-draft";

export interface SignupDraft {
  gym_name: string;
  name: string;
}

export function saveSignupDraft(draft: SignupDraft): void {
  sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft));
}

export function readSignupDraft(): SignupDraft | null {
  try {
    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SignupDraft;
    return draft?.gym_name && draft?.name ? draft : null;
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
}

// Invoca la edge function con la sesión actual. Devuelve el gym creado o tira
// un Error con mensaje mostrable (403 kill switch / caps, 429 rate limit, …).
export async function createSelfServiceGym(
  draft: SignupDraft
): Promise<{ gymId: string }> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.functions.invoke(
    "crear-gym-self-service",
    { body: draft }
  );
  if (error) {
    throw new Error(
      await readFunctionError(
        error,
        "No pudimos crear tu gimnasio. Intentá de nuevo."
      )
    );
  }
  if (!data?.gym_id) {
    throw new Error("No pudimos crear tu gimnasio. Intentá de nuevo.");
  }
  return { gymId: data.gym_id as string };
}
