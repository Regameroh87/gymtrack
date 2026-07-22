"use client";

// Paso 1 del signup self-service: nombre del gym + datos del owner.
// Sin sesión: OTP con shouldCreateUser:true (la excepción deliberada al
// shouldCreateUser:false del login; acá SÍ queremos crear la cuenta) y el
// borrador viaja por sessionStorage a /registro/verificar.
// Con sesión (multi-gym): salta el OTP e invoca la edge function directo.

// React
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Librerías
import { Mail, User, Dumbbell, ArrowRight } from "lucide-react";

// Supabase y helpers
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  saveSignupDraft,
  createSelfServiceGym,
} from "@/lib/self-service-signup";
import { setActiveGym } from "@/lib/auth/actions";

// Componentes
import { AuthSplit, AuthCompactBrand } from "@/components/auth/auth-split";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_BOX =
  "flex flex-row items-center rounded-2xl border border-[#4a44e4]/40 bg-[#0c006a]/40 px-4 py-1 transition hover:border-[#4a44e4] focus-within:border-[#4a44e4]";
const FIELD_INPUT =
  "ml-3 h-14 flex-1 bg-transparent font-manrope text-base text-white outline-none placeholder:text-[#c2c1ff]/50";
const FIELD_LABEL =
  "mb-2 block px-1 font-manrope text-sm font-bold text-[#e2dfff]";

function getOtpErrorMessage(err: unknown): string {
  const e = err as { status?: number };
  if (e?.status === 429)
    return "Demasiados intentos. Por favor, reintentá más tarde.";
  return "Ha ocurrido un error, intentá nuevamente.";
}

export function SignupForm({
  isLoggedIn,
  sessionEmail,
}: {
  isLoggedIn: boolean;
  sessionEmail?: string | null;
}) {
  const router = useRouter();
  const [gymName, setGymName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(sessionEmail ?? "");
  const [pending, setPending] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState("");

  const gymNameError =
    gymName.trim().length < 3 || gymName.trim().length > 60
      ? "El nombre del gimnasio debe tener entre 3 y 60 caracteres"
      : "";
  const nameError = !name.trim() ? "Tu nombre es obligatorio" : "";
  const emailError = !EMAIL_REGEX.test(email) ? "Ingresá un email válido" : "";
  const canSubmit = !gymNameError && !nameError && !emailError;
  const firstError = gymNameError || nameError || emailError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit || pending) return;

    setServerError("");
    setPending(true);
    const draft = { gym_name: gymName.trim(), name: name.trim() };

    try {
      if (isLoggedIn) {
        // Ya autenticado (multi-gym): crea el gym directo, sin OTP.
        const { gymId } = await createSelfServiceGym(draft);
        await setActiveGym(gymId);
        router.replace("/admin?bienvenida=1");
        return;
      }

      const supabase = getBrowserSupabase();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;

      saveSignupDraft(draft);
      router.replace(
        `/registro/verificar?email=${encodeURIComponent(email.trim())}`
      );
    } catch (err) {
      setServerError(
        err instanceof Error && err.message
          ? err.message
          : getOtpErrorMessage(err)
      );
      setPending(false);
    }
  };

  return (
    <AuthSplit
      heading={"Tu gimnasio,\nonline en minutos."}
      subtitle="Creá tu cuenta, sumá a tus socios y gestioná actividades, pagos y asistencia desde el primer día. 14 días gratis, sin tarjeta."
    >
      <AuthCompactBrand />

      <div className="mb-8">
        <h1 className="font-jakarta text-3xl font-extrabold tracking-tight text-white">
          Creá tu gimnasio
        </h1>
        <p className="mt-2 font-manrope text-base text-[#c2c1ff]">
          Probalo gratis 14 días. No te pedimos tarjeta.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="w-full">
          <label htmlFor="gym-name" className={FIELD_LABEL}>
            Nombre del gimnasio
          </label>
          <div className={FIELD_BOX}>
            {gymName === "" && <Dumbbell color="#c2c1ff" size={20} />}
            <input
              id="gym-name"
              type="text"
              autoComplete="organization"
              placeholder="Energym"
              value={gymName}
              onChange={(ev) => {
                setServerError("");
                setGymName(ev.target.value);
              }}
              className={FIELD_INPUT}
            />
          </div>
        </div>

        <div className="mt-4 w-full">
          <label htmlFor="owner-name" className={FIELD_LABEL}>
            Tu nombre
          </label>
          <div className={FIELD_BOX}>
            {name === "" && <User color="#c2c1ff" size={20} />}
            <input
              id="owner-name"
              type="text"
              autoComplete="name"
              placeholder="Ana García"
              value={name}
              onChange={(ev) => {
                setServerError("");
                setName(ev.target.value);
              }}
              className={FIELD_INPUT}
            />
          </div>
        </div>

        <div className="mt-4 w-full">
          <label htmlFor="email" className={FIELD_LABEL}>
            Correo electrónico
          </label>
          <div className={FIELD_BOX}>
            {email === "" && <Mail color="#c2c1ff" size={20} />}
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="hola@ejemplo.com"
              value={email}
              disabled={isLoggedIn}
              onChange={(ev) => {
                setServerError("");
                setEmail(ev.target.value);
              }}
              className={`${FIELD_INPUT} ${isLoggedIn ? "opacity-60" : ""}`}
            />
          </div>
          {isLoggedIn && (
            <p className="mt-1 px-1 font-manrope text-xs text-[#c2c1ff]/70">
              El gimnasio nuevo se suma a tu cuenta actual.
            </p>
          )}
        </div>

        <div className="mt-1 min-h-10 px-1">
          {submitAttempted && firstError && (
            <p className="mt-1 font-manrope text-sm font-bold text-[#ffdad6]">
              {firstError}
            </p>
          )}
          {serverError && (
            <p className="mt-1 font-manrope text-sm font-bold text-[#ffdad6]">
              {serverError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending || (submitAttempted && !canSubmit)}
          className={`mt-2 flex w-full flex-row items-center justify-center rounded-2xl p-4 transition ${
            pending || (submitAttempted && !canSubmit)
              ? "cursor-not-allowed border border-[#4a44e4]/30 bg-[#4a44e4]/60"
              : "border border-[#d6d4ff]/30 bg-[#4a44e4] hover:scale-[1.01] hover:bg-[#3a34d4]"
          }`}
        >
          <span
            className={`mr-2 font-manrope text-lg font-bold ${
              pending ? "text-white/60" : "text-white"
            }`}
          >
            {pending
              ? "Procesando..."
              : isLoggedIn
                ? "Crear mi gimnasio"
                : "Empezar gratis"}
          </span>
          {!pending && <ArrowRight color="white" size={20} />}
        </button>
      </form>

      <p className="mt-8 text-center font-manrope text-xs text-[#c2c1ff]/70">
        Al continuar aceptas nuestros términos de uso y política de privacidad.
      </p>

      {!isLoggedIn && (
        <p className="mt-4 text-center font-manrope text-sm text-[#c2c1ff]">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-bold text-white underline">
            Iniciar sesión
          </Link>
        </p>
      )}
    </AuthSplit>
  );
}
