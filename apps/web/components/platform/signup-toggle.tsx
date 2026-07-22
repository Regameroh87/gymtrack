"use client";

// Toggle del kill switch de registros self-service (platform_settings, fila
// única). El update pasa por RLS: solo is_platform_admin() puede escribir.
// El efecto es inmediato en la edge function; la landing (ISR) lo toma en ≤5 min.

import { useState } from "react";
import { Globe, Lock } from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export function SignupToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    const next = !enabled;
    const supabase = getBrowserSupabase();
    const { error: updateError } = await supabase
      .from("platform_settings")
      .update({ self_service_signup_enabled: next })
      .eq("id", true);
    if (updateError) {
      setError("No se pudo actualizar el estado. Intentá de nuevo.");
    } else {
      setEnabled(next);
    }
    setPending(false);
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            enabled ? "bg-emerald-50" : "bg-gray-100"
          }`}
        >
          {enabled ? (
            <Globe size={18} className="text-emerald-600" />
          ) : (
            <Lock size={18} className="text-gray-500" />
          )}
        </div>
        <div>
          <p className="font-manrope text-sm font-bold text-gray-900">
            Registros self-service
          </p>
          <p className="font-manrope text-xs text-gray-400">
            {enabled
              ? "Abiertos: cualquiera puede crear su gimnasio desde /registro."
              : "Cerrados: /registro muestra el aviso de contacto y la creación está bloqueada."}
          </p>
          {error && (
            <p className="mt-1 font-manrope text-xs font-bold text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={pending}
        className={`relative h-7 w-[52px] shrink-0 rounded-full transition ${
          enabled ? "bg-emerald-500" : "bg-gray-300"
        } ${pending ? "cursor-wait opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            enabled ? "left-[24px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
