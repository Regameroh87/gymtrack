// @gymtrack/core se publica como source JS sin tipos. Este proyecto Next usa TS
// estricto, así que declaramos acá los subpaths del core que consume la web.
// A medida que la web use más de core (hooks, utils) se van sumando módulos.

declare module "@gymtrack/core/supabase" {
  import type { SupabaseClient } from "@supabase/supabase-js";

  export function createSupabaseClient(opts: {
    url?: string;
    key?: string;
    storage?: unknown;
    auth?: Record<string, unknown>;
  }): SupabaseClient;

  export function setSupabaseClient(client: SupabaseClient): void;
  export function getSupabaseClient(): SupabaseClient;
  export const supabase: SupabaseClient;
}

declare module "@gymtrack/core/colors" {
  export type Ramp = Record<number, string>;
  export const brandPrimary: Ramp;
  export const brandSecondary: Ramp;
  export const ui: {
    background: Record<string, string>;
    surface: Record<string, string>;
    surfaceSecondary: Record<string, string>;
    text: Record<string, string>;
    input: Record<string, string>;
    toggle: Record<string, string>;
    placeholder: Record<string, string>;
    overlay: Record<string, string>;
    status: Record<string, string>;
    decor: Record<string, unknown>;
    icon: Record<string, string>;
    border: Record<string, string>;
    arrow: Record<string, string>;
    [k: string]: unknown;
  };
  export const gradient: Record<string, unknown>;
}

declare module "@gymtrack/core/generate-ramp" {
  import type { Ramp } from "@gymtrack/core/colors";
  export function generateRamp(seed: string): Ramp;
  export function rampToChannels(ramp: Ramp): Record<number, string>;
  export const SHADES: number[];
}
