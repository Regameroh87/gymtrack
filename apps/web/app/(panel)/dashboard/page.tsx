// Resolver post-login: redirige al destino según rol/gym. No renderiza UI; es el
// punto neutro al que apuntan login/verify y el middleware tras autenticarse.

import { redirect } from "next/navigation";

import { getSessionContext, getPostLoginPath } from "@/lib/auth/session";

export default async function DashboardPage() {
  const ctx = await getSessionContext();
  redirect(getPostLoginPath(ctx));
}
