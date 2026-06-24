"use server";

// Server actions de auth: persistir el gym activo en cookie y cerrar sesión.
// Se invocan desde los providers/pantallas cliente (switchGym, exitGym, signOut).

// Librerías
import { cookies } from "next/headers";

// Supabase y sesión
import { createServerSupabase } from "@/lib/supabase-server";
import { ACTIVE_GYM_COOKIE } from "@/lib/auth/session";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Persiste el gym activo (cookie legible por SSR). gymId=null lo limpia (exitGym).
export async function setActiveGym(gymId: string | null): Promise<void> {
  const cookieStore = await cookies();
  if (!gymId) {
    cookieStore.delete(ACTIVE_GYM_COOKIE);
    return;
  }
  cookieStore.set(ACTIVE_GYM_COOKIE, gymId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

// Cierra la sesión (limpia cookies de Supabase) y olvida el gym activo.
export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_GYM_COOKIE);
}
