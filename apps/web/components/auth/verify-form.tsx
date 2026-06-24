"use client";

// Form de verificación del código OTP. Réplica de apps/mobile/src/auth/lib/verifyCode.js:
// verifyOtp({ email, token, type:"email" }) → al validar, la sesión queda en cookies
// y se redirige al destino post-login (resolver /dashboard, o `next` si venía de un guard).

// React
import { useState } from "react";
import { useRouter } from "next/navigation";

// Supabase
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function VerifyForm({ email, next }: { email: string; next?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;

      // La sesión ya está en cookies: el resolver decide a dónde ir según el rol.
      router.replace(next || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-jakarta text-xl font-bold text-brandPrimary-950">
          Verificá tu email
        </h1>
        <p className="text-sm text-gray-500">
          Ingresá el código que enviamos a <span className="font-medium">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-sm font-medium text-gray-700">
            Código
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg tracking-widest outline-none focus:border-brandPrimary-700 focus:ring-2 focus:ring-brandPrimary-700/20"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brandPrimary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandPrimary-600 disabled:opacity-60"
        >
          {pending ? "Verificando…" : "Entrar"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => router.push("/login")}
        className="text-xs text-gray-400 underline-offset-2 hover:underline"
      >
        Volver a ingresar el email
      </button>
    </div>
  );
}
