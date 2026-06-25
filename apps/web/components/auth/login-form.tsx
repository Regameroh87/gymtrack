"use client";

// Pantalla de login por OTP de email. Clon 1:1 de apps/mobile/app/(auth)/login.web.jsx.
// Lógica: pre-check email_exists (RPC SECURITY DEFINER) → signInWithOtp(shouldCreateUser:false)
// → pantalla /verify (réplica de src/auth/lib/sendCode.js).

// React
import { useState } from "react";
import { useRouter } from "next/navigation";

// Librerías
import { Mail, ArrowRight } from "lucide-react";

// Supabase
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Componentes
import { AuthSplit, AuthCompactBrand } from "@/components/auth/auth-split";
import { DevLoginPanel } from "@/components/auth/dev-login-panel";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SupabaseError = { status?: number; message?: string };

function getErrorMessage(err: SupabaseError | null): string {
  if (!err) return "";
  if (err.status === 422)
    return "Este email no está autorizado para ingresar. Contactese con administración.";
  if (err.status === 429)
    return "Demasiados intentos. Por favor, reintentá más tarde.";
  return "Ha ocurrido un error, intente nuevamente.";
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorSupabase, setErrorSupabase] = useState("");

  const fieldError = !email
    ? "El email es obligatorio"
    : !EMAIL_REGEX.test(email)
      ? "Ingresá un email válido"
      : "";
  const canSubmit = EMAIL_REGEX.test(email);
  const showFieldError = fieldError && (blurred || submitAttempted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit || pending) return;

    setErrorSupabase("");
    setPending(true);
    try {
      const supabase = getBrowserSupabase();

      // Pre-check de existencia (no se puede leer profiles desde anon por RLS).
      const { data: exists, error: rpcError } = await supabase.rpc("email_exists", {
        p_email: email.trim(),
      });
      if (rpcError) throw rpcError;
      if (!exists) throw new Error("Usuario no encontrado.");

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;

      const params = new URLSearchParams({ email: email.trim() });
      if (next) params.set("next", next);
      router.replace(`/verify?${params.toString()}`);
    } catch (err) {
      setErrorSupabase(getErrorMessage(err as SupabaseError));
      setPending(false);
    }
  };

  return (
    <AuthSplit
      heading={"Entrena con\nPropósito."}
      subtitle="Una plataforma diseñada para que entrenadores y atletas trabajen en sintonía, sesión tras sesión."
    >
      <AuthCompactBrand />

      <div className="mb-8">
        <h1 className="font-jakarta text-3xl font-extrabold tracking-tight text-white">
          Iniciar sesión
        </h1>
        <p className="mt-2 font-manrope text-base text-[#c2c1ff]">
          Ingresa tu email para recibir un enlace de acceso mágico.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="w-full">
          <label
            htmlFor="email"
            className="mb-2 block px-1 font-manrope text-sm font-bold text-[#e2dfff]"
          >
            Correo electrónico
          </label>
          <div className="flex flex-row items-center rounded-2xl border border-[#4a44e4]/40 bg-[#0c006a]/40 px-4 py-1 transition hover:border-[#4a44e4] focus-within:border-[#4a44e4]">
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
              onChange={(ev) => {
                setErrorSupabase("");
                setEmail(ev.target.value);
              }}
              onBlur={() => setBlurred(true)}
              className="ml-3 h-14 flex-1 bg-transparent font-manrope text-base text-white outline-none placeholder:text-[#c2c1ff]/50"
            />
          </div>

          <div className="mt-1 min-h-10 px-1">
            {showFieldError && (
              <p className="mt-1 font-manrope text-sm font-bold text-[#ffdad6]">
                {fieldError}
              </p>
            )}
            {errorSupabase && (
              <p className="mt-1 font-manrope text-sm font-bold text-[#ffdad6]">
                {errorSupabase}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className={`mt-2 flex w-full flex-row items-center justify-center rounded-2xl p-4 transition ${
            pending || !canSubmit
              ? "cursor-not-allowed border border-[#4a44e4]/30 bg-[#4a44e4]/60"
              : "border border-[#d6d4ff]/30 bg-[#4a44e4] hover:scale-[1.01] hover:bg-[#3a34d4]"
          }`}
        >
          <span
            className={`mr-2 font-manrope text-lg font-bold ${
              pending || !canSubmit ? "text-white/60" : "text-white"
            }`}
          >
            {pending ? "Procesando..." : "Continuar"}
          </span>
          {!pending && (
            <ArrowRight
              color={!canSubmit ? "rgba(255,255,255,0.6)" : "white"}
              size={20}
            />
          )}
        </button>
      </form>

      <p className="mt-8 text-center font-manrope text-xs text-[#c2c1ff]/70">
        Al continuar aceptas nuestros términos de uso y política de privacidad.
      </p>

      <div className="flex items-center justify-center">
        <DevLoginPanel next={next} />
      </div>
    </AuthSplit>
  );
}
