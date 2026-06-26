// Pantalla de verificación del código OTP. El email no viaja por la URL: lo lee
// el form desde sessionStorage (lo dejó el login). Sin email guardado, el propio
// form redirige a /login.

import { VerifyForm } from "@/components/auth/verify-form";

export const metadata = {
  title: "Verificar email",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return <VerifyForm />;
}
