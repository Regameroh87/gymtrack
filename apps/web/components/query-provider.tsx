"use client";

// Provider de TanStack Query para el panel. Las pantallas migradas desde los
// .web.jsx de Expo leen Supabase directo con useQuery client-side (la base
// offline es un stub en web), así que necesitan un QueryClient en el árbol.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
