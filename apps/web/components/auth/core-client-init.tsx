"use client";

// Registra el cliente Supabase del navegador en el proxy global de @gymtrack/core
// (setSupabaseClient), para que los hooks de core (supabase.from/rpc) funcionen en
// client components cuando se migren pantallas en fases siguientes. Solo en cliente:
// en el servidor se usa SIEMPRE un cliente por request (createServerSupabase).

// React
import { useRef } from "react";

// Supabase y core
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { setSupabaseClient } from "@gymtrack/core/supabase";

export function CoreClientInit({ children }: { children: React.ReactNode }) {
  // Registro síncrono en el primer render (antes de que hijos usen hooks de core).
  const registered = useRef(false);
  if (!registered.current) {
    setSupabaseClient(getBrowserSupabase());
    registered.current = true;
  }
  return <>{children}</>;
}
