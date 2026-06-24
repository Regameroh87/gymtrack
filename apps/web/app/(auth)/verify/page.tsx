// Pantalla de verificación del código OTP. Sin email en el query (acceso directo),
// vuelve al login.

import { redirect } from "next/navigation";

import { VerifyForm } from "@/components/auth/verify-form";

export const metadata = {
  title: "Verificar email",
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  if (!email) redirect("/login");
  return <VerifyForm email={email} next={next} />;
}
