// Paso 2 del signup self-service: verificación del OTP + creación del gym.
// Sin email en el query (acceso directo) o con los registros cerrados, vuelve
// a /registro (que muestra el aviso correspondiente).

import { redirect } from "next/navigation";

import { getSelfServiceSignupEnabled } from "@/lib/platform-settings";
import { SignupVerifyForm } from "@/components/auth/signup-verify-form";

export const metadata = {
  title: "Verificar email",
  robots: { index: false, follow: false },
};

export default async function RegistroVerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const enabled = await getSelfServiceSignupEnabled();
  if (!email || !enabled) redirect("/registro");
  return <SignupVerifyForm email={email} />;
}
