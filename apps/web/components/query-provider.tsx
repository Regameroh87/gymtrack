"use client";

// Provider de TanStack Query para el panel. Las pantallas migradas desde los
// .web.jsx de Expo leen Supabase directo con useQuery client-side (la base
// offline es un stub en web), así que necesitan un QueryClient en el árbol.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Defaults pensados para el panel: los datos del gym no cambian a cada segundo,
// así que evitamos refetchear en cada mount/focus de pestaña (lo que hacía que
// cada navegación volviera a pegarle a Supabase y se sintiera lento).
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 min: sirve cache sin refetch en navegación rápida
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
