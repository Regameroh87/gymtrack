// Resolver post-login: redirige al destino según rol/gym. No renderiza UI; es el
// punto neutro al que apuntan login/verify y el middleware tras autenticarse.

import { redirect } from "next/navigation";

import { getSessionContext, getPostLoginDestination } from "@/lib/auth/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const ctx = await getSessionContext();
  const { next } = await searchParams;
  redirect(getPostLoginDestination(ctx, next));
}
