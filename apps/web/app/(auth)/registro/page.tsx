// Signup self-service: el dueño crea su propio gimnasio con el trial vigente
// sin tarjeta. Ruta pública (con o sin sesión: un usuario logueado puede crear
// otro gym — multi-gym). Gateada por el kill switch de platform_settings; el
// enforcement real está en la edge function, acá solo se elige qué mostrar.

import { Mail } from "lucide-react";

import {
  getSelfServiceSignupEnabled,
  getPublicTrialDays,
} from "@/lib/platform-settings";
import { getSessionContext } from "@/lib/auth/session";
import { MAILTO_HREF, CONTACT } from "@/lib/site";
import { AuthSplit, AuthCompactBrand } from "@/components/auth/auth-split";
import { SignupForm } from "@/components/auth/signup-form";

// Sin esto, Next prerenderiza la página en build (el flag apagado quedaría
// congelado en el HTML estático). El kill switch debe leerse por request.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const trialDays = await getPublicTrialDays();
  return {
    title: "Creá tu gimnasio",
    description: `Registrá tu gimnasio en GymTrack y probalo gratis ${trialDays} días, sin tarjeta.`,
  };
}

function SignupClosedNotice() {
  return (
    <AuthSplit
      heading={"Tu gimnasio,\nonline en minutos."}
      subtitle="Una plataforma diseñada para que entrenadores y atletas trabajen en sintonía, sesión tras sesión."
    >
      <AuthCompactBrand />

      <div className="flex flex-col items-center text-center">
        <div className="mb-5 rounded-full border border-[#4a44e4]/30 bg-[#4a44e4]/20 p-4">
          <Mail color="#c2c1ff" size={36} />
        </div>
        <h1 className="font-jakarta text-3xl font-extrabold tracking-tight text-white">
          Registros temporalmente cerrados
        </h1>
        <p className="mt-3 font-manrope text-base leading-relaxed text-[#c2c1ff]">
          Por el momento estamos sumando gimnasios de forma personalizada.
          Escribinos y te ayudamos a dejar el tuyo funcionando.
        </p>
        <a
          href={MAILTO_HREF}
          className="mt-8 flex w-full flex-row items-center justify-center rounded-2xl border border-[#d6d4ff]/30 bg-[#4a44e4] p-4 font-manrope text-lg font-bold text-white transition hover:scale-[1.01] hover:bg-[#3a34d4]"
        >
          Escribinos
        </a>
        <p className="mt-4 font-manrope text-sm text-[#c2c1ff]/70">
          {CONTACT.email}
        </p>
      </div>
    </AuthSplit>
  );
}

export default async function RegistroPage() {
  const [enabled, trialDays] = await Promise.all([
    getSelfServiceSignupEnabled(),
    getPublicTrialDays(),
  ]);
  if (!enabled) return <SignupClosedNotice />;

  const ctx = await getSessionContext();
  return (
    <SignupForm
      isLoggedIn={!!ctx.authUser}
      sessionEmail={ctx.authUser?.email ?? null}
      trialDays={trialDays}
    />
  );
}
