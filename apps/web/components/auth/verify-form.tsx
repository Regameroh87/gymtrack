"use client";

// Form de verificación del código OTP. Clon del split de apps/mobile verify.web.jsx:
// 6 cajas de un dígito (auto-focus, backspace, paste), sobre el panel oscuro de AuthSplit.
// Lógica: verifyOtp({ email, token, type:"email" }) → al validar, la sesión queda en cookies
// y se redirige al destino post-login (resolver /dashboard, o `next` si venía de un guard).

// React
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Librerías
import { MailCheck } from "lucide-react";

// Supabase
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Componentes
import { AuthSplit, AuthCompactBrand } from "@/components/auth/auth-split";

const EMPTY_CODE = ["", "", "", "", "", ""];

export function VerifyForm() {
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // El email y el destino post-login los dejó el login en sessionStorage. Sin
  // email guardado (acceso directo a /verify), volvemos al login.
  const [email, setEmail] = useState<string | null>(null);
  const nextRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const stored = sessionStorage.getItem("gt:verifyEmail");
    if (!stored) {
      router.replace("/login");
      return;
    }
    nextRef.current = sessionStorage.getItem("gt:verifyNext") || undefined;
    setEmail(stored);
  }, [router]);

  const canSubmit = code.every((d) => d !== "");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || pending || !email) return;

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

      // La sesión ya está en cookies: el resolver decide a dónde ir según el rol.
      router.replace(next || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(getVerifyError(err));
      setPending(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setCode(EMPTY_CODE);
    inputRefs.current[0]?.focus();
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
    } catch {
      // Reenvío best-effort; el usuario puede reintentar.
    }
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const newCode = [...prev];
      newCode[index] = digit;
      return newCode;
    });
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const newCode = [...EMPTY_CODE];
    for (let i = 0; i < 6; i++) newCode[i] = pasted[i] || "";
    setCode(newCode);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <AuthSplit
      heading={"Casi\nListos."}
      subtitle="Revisá tu bandeja de entrada. Te enviamos un código de 6 dígitos para confirmar tu identidad."
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

      <form onSubmit={handleVerify}>
        <div className="mb-2 flex w-full flex-row justify-center gap-3">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="h-14 w-12 rounded-xl border border-[#4a44e4]/40 bg-[#0c006a]/40 text-center font-manrope text-2xl font-bold text-white outline-none focus:border-[#c2c1ff]"
            />
          ))}
        </div>

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
            {pending ? "Verificando..." : "Verificar código"}
          </span>
        </button>
      </form>

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
    </AuthSplit>
  );
}

// Errores de verifyOtp mapeados como en Expo verify.web.jsx.
function getVerifyError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status === 400) {
    const msg = (e.message ?? "").toLowerCase();
    if (msg.includes("expired")) return "El código ha expirado, pedí uno nuevo";
    if (msg.includes("invalid"))
      return "Código incorrecto, verificalo e intentá de nuevo";
  }
  return "Ha ocurrido un error, intentalo de nuevo";
}
