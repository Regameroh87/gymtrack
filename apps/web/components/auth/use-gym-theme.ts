"use client";

// useGymTheme(): shim web del contexto de tema por gym de Expo
// (apps/mobile/src/contexts/gym-theme-context.jsx). Devuelve la MISMA shape que
// consumen las pantallas migradas (brandPrimary[600], brandSecondary[500],
// gymName, logoUrl) para portarlas sin cambios.
//
// Nota: por ahora devuelve la paleta DEFAULT (Editorial Pass), igual que los
// tokens estáticos de Tailwind (brandPrimary-*/brandSecondary-*). Así los colores
// inline JS coinciden con las clases. El white-label per-gym (CSS vars + rampas
// del seed del gym) es un paso posterior; cuando se cablee, resolver acá las
// rampas con generateRamp(gym.theme_primary/accent).

import {
  brandPrimary as defaultPrimary,
  brandSecondary as defaultSecondary,
  gradient as defaultGradient,
  type Ramp,
} from "@gymtrack/core/colors";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { mediaUrl } from "@/lib/media";

export interface GymTheme {
  brandPrimary: Ramp;
  brandSecondary: Ramp;
  gradient: Record<string, unknown>;
  gymName: string | null;
  logoUrl: string | null;
}

export function useGymTheme(): GymTheme {
  const { gym } = useActiveGym();

  return {
    brandPrimary: defaultPrimary,
    brandSecondary: defaultSecondary,
    gradient: defaultGradient,
    gymName: gym?.name ?? null,
    logoUrl: mediaUrl(gym?.logo_url ?? null),
  };
}
