"use client";

// Paso 2 del signup self-service: verifica el OTP y crea el gym.
// Tras verifyOtp la sesión ya está en cookies; si la creación del gym falla,
// se ofrece reintento SIN perder la sesión (y si el usuario abandona, puede
// volver a /registro ya logueado y crear el gym por el camino directo).

// React
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Librerías
import { MailCheck } from "lucide-react";

// Supabase y helpers
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  readSignupDraft,
  clearSignupDraft,
  createSelfServiceGym,
} from "@/lib/self-service-signup";
import { setActiveGym } from "@/lib/auth/actions";

// Componentes
import { AuthSplit, AuthCompactBrand } from "@/components/auth/auth-split";
import {
  OtpCodeInput,
  EMPTY_OTP_CODE,
  type OtpCodeInputHandle,
} from "@/components/auth/otp-code-input";

export function SignupVerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const otpRef = useRef<OtpCodeInputHandle | null>(null);
  const [code, setCode] = useState<string[]>(EMPTY_OTP_CODE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // La verificación OTP ya pasó pero la creación del gym falló → solo reintentar la creación.
  const [creationFailed, setCreationFailed] = useState(false);

  const canSubmit = code.every((d) => d !== "");

  const createGymAndEnter = async () => {
    const draft = readSignupDraft();
    if (!draft) {
      // Borrador perdido (otra pestaña / storage limpio): se vuelve al paso 1,
      // ya con sesión, donde el submit crea el gym por el camino directo.
      router.replace("/registro");
      return;
    }
    const { gymId } = await createSelfServiceGym(draft);
    clearSignupDraft();
    await setActiveGym(gymId);
    router.replace("/admin?bienvenida=1");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || pending) return;

    setError(null);
    setPending(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.join("").trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;

      try {
        await createGymAndEnter();
      } catch (creationErr) {
        setCreationFailed(true);
        throw creationErr;
      }
    } catch (err) {
      setError(getVerifyError(err));
      setPending(false);
    }
  };

  const handleRetryCreation = async () => {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await createGymAndEnter();
    } catch (err) {
      setError(getVerifyError(err));
      setPending(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setCode(EMPTY_OTP_CODE);
    otpRef.current?.focusFirst();
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
    } catch {
      // Reenvío best-effort; el usuario puede reintentar.
    }
  };

  return (
    <AuthSplit
      heading={"Casi\nListos."}
      subtitle="Revisá tu bandeja de entrada. Te enviamos un código de 6 dígitos para confirmar tu email y crear tu gimnasio."
    >
      <AuthCompactBrand />

      <div className="mb-8 flex flex-col items-center">
        <div className="mb-5 rounded-full border border-[#4a44e4]/30 bg-[#4a44e4]/20 p-4">
          <MailCheck color="#c2c1ff" size={36} />
        </div>
        <h1 className="text-center font-jakarta text-3xl font-extrabold tracking-tight text-white">
          Revisá tu correo
        </h1>
        <p className="mt-2 text-center font-manrope text-base text-[#c2c1ff]">
          Ingresá el código de 6 dígitos que enviamos a{" "}
          <span className="font-manrope font-bold text-white">{email}</span>
        </p>
      </div>

      {creationFailed ? (
        <div>
          <p className="text-center font-manrope text-base text-[#c2c1ff]">
            Tu email quedó verificado, pero no pudimos crear el gimnasio.
          </p>
          <div className="mb-2 min-h-[50px] w-full justify-center pt-2">
            {error && (
              <p className="mt-2 text-center font-manrope text-sm font-bold text-[#ffdad6]">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRetryCreation}
            disabled={pending}
            className={`flex w-full flex-row items-center justify-center rounded-2xl p-4 transition ${
              pending
                ? "cursor-not-allowed border border-[#4a44e4]/30 bg-[#4a44e4]/60"
                : "border border-[#d6d4ff]/30 bg-[#4a44e4] hover:scale-[1.01] hover:bg-[#3a34d4]"
            }`}
          >
            <span
              className={`text-center font-manrope text-lg font-bold ${
                pending ? "text-white/60" : "text-white"
              }`}
            >
              {pending ? "Creando..." : "Reintentar"}
            </span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify}>
          <OtpCodeInput ref={otpRef} code={code} onChange={setCode} />

          <div className="mb-2 min-h-[50px] w-full justify-center pt-2">
            {error ? (
              <div>
                <p className="mt-2 text-center font-manrope text-sm font-bold text-[#ffdad6]">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  className="w-full rounded-xl p-2"
                >
                  <span className="text-center font-manrope text-sm font-bold text-[#c2c1ff] underline">
                    Reenviar código
                  </span>
                </button>
              </div>
            ) : (
              <p className="text-center font-manrope text-sm text-[#c2c1ff]">
                Revisá tu correo no deseado por si acaso
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending || !canSubmit}
            className={`flex w-full flex-row items-center justify-center rounded-2xl p-4 transition ${
              pending || !canSubmit
                ? "cursor-not-allowed border border-[#4a44e4]/30 bg-[#4a44e4]/60"
                : "border border-[#d6d4ff]/30 bg-[#4a44e4] hover:scale-[1.01] hover:bg-[#3a34d4]"
            }`}
          >
            <span
              className={`text-center font-manrope text-lg font-bold ${
                pending || !canSubmit ? "text-white/60" : "text-white"
              }`}
            >
              {pending ? "Creando tu gimnasio..." : "Verificar y crear"}
            </span>
          </button>
        </form>
      )}

      {!creationFailed && (
        <p className="mt-8 text-center font-manrope text-xs text-[#c2c1ff]/70">
          ¿No recibiste el código?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="font-manrope text-[#c2c1ff] underline"
          >
            Reenviar
          </button>
        </p>
      )}
    </AuthSplit>
  );
}

// Errores de verifyOtp / creación, mapeados como en verify-form.
function getVerifyError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status === 400) {
    const msg = (e.message ?? "").toLowerCase();
    if (msg.includes("expired")) return "El código ha expirado, pedí uno nuevo";
    if (msg.includes("invalid"))
      return "Código incorrecto, verificalo e intentá de nuevo";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Ha ocurrido un error, intentalo de nuevo";
}
