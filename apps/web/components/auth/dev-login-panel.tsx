"use client";

// Accesos rápidos de desarrollo: un click loguea con un usuario de prueba por rol,
// sin pasar por el OTP. Invisible en producción. Port de
// apps/mobile/src/components/dev-login-panel.jsx.

// React
import { useState } from "react";
import { useRouter } from "next/navigation";

// Auth
import { DEV_USERS, devSignIn } from "@/lib/dev-login";

const IS_DEV = process.env.NODE_ENV !== "production";

export function DevLoginPanel({ next }: { next?: string }) {
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!IS_DEV) return null;

  const handlePress = async (email: string) => {
    setError("");
    setPendingEmail(email);
    try {
      await devSignIn(email);
      // Pasa siempre por el resolver de rol; `next` se respeta solo si es del área del rol.
      router.replace(next ? `/dashboard?next=${encodeURIComponent(next)}` : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de login");
      setPendingEmail(null);
    }
  };

  return (
    <div className="mt-6 w-[85%] max-w-[440px] items-center">
      <p className="mb-3 text-center font-manrope text-[11px] font-bold uppercase tracking-widest text-[#2DD4BF]">
        Dev login
      </p>
      <div className="flex flex-row flex-wrap justify-center gap-3">
        {DEV_USERS.map(({ label, email }) => (
          <button
            key={email}
            type="button"
            disabled={pendingEmail !== null}
            onClick={() => handlePress(email)}
            className={`rounded-xl border px-4 py-2 font-manrope text-sm font-bold text-white transition ${
              pendingEmail === email
                ? "border-[#2DD4BF] bg-[#2DD4BF]/30"
                : "border-white/20 bg-white/10 hover:bg-white/20"
            }`}
          >
            {pendingEmail === email ? "..." : label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-2 text-center font-manrope text-xs font-bold text-[#ffdad6]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
