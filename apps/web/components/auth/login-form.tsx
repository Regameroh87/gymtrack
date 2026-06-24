"use client";

// Form de login por OTP de email. Réplica de apps/mobile/src/auth/lib/sendCode.js:
// pre-check email_exists (RPC SECURITY DEFINER) → signInWithOtp(shouldCreateUser:false)
// → pantalla /verify. En desarrollo agrega un atajo de login por contraseña.

// React
import { useState } from "react";
import { useRouter } from "next/navigation";

// Supabase
import { getBrowserSupabase } from "@/lib/supabase-browser";

const IS_DEV = process.env.NODE_ENV !== "production";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      router.push(`/verify?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código.");
      setPending(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (pwError) throw pwError;
      router.replace(next || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-jakarta text-xl font-bold text-brandPrimary-950">
          Iniciar sesión
        </h1>
        <p className="text-sm text-gray-500">
          {devMode
            ? "Ingresá con tu email y contraseña."
            : "Te enviamos un código a tu email para entrar."}
        </p>
      </div>

      <form
        onSubmit={devMode ? handlePassword : handleOtp}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brandPrimary-700 focus:ring-2 focus:ring-brandPrimary-700/20"
          />
        </div>

        {devMode && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brandPrimary-700 focus:ring-2 focus:ring-brandPrimary-700/20"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brandPrimary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brandPrimary-600 disabled:opacity-60"
        >
          {pending ? "Enviando…" : devMode ? "Entrar" : "Enviar código"}
        </button>
      </form>

      {IS_DEV && (
        <button
          type="button"
          onClick={() => {
            setDevMode((v) => !v);
            setError(null);
          }}
          className="text-xs text-gray-400 underline-offset-2 hover:underline"
        >
          {devMode ? "Usar código por email" : "Entrar con contraseña (dev)"}
        </button>
      )}
    </div>
  );
}
