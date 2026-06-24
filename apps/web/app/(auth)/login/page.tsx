// Pantalla de login (OTP de email). El form es client; la page resuelve el
// destino de retorno (?next) del query.

import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}
