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
