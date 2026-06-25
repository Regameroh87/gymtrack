"use client";

// Acción "Entrar" al panel operativo de un gym (modo administrador del super_admin).
// Persiste el gym activo en cookie vía switchGym y entra a /admin. Réplica del
// handleEnter de las cards de gym en Expo (.web.jsx).

// React
import { useState } from "react";

// Iconos
import { ArrowRight } from "lucide-react";

// Contexto
import { useActiveGym } from "@/components/auth/active-gym-provider";

export function EnterGymButton({
  gymId,
  variant = "solid",
}: {
  gymId: string;
  variant?: "solid" | "ghost";
}) {
  const { switchGym } = useActiveGym();
  const [entering, setEntering] = useState(false);

  const handleEnter = async () => {
    if (entering) return;
    setEntering(true);
    try {
      await switchGym(gymId);
    } catch {
      setEntering(false);
    }
  };

  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={handleEnter}
        disabled={entering}
        className="flex items-center gap-1 disabled:opacity-60"
      >
        <span className="font-manrope text-[12px] font-semibold text-brandPrimary-700">
          {entering ? "Entrando…" : "Entrar"}
        </span>
        <ArrowRight size={13} className="text-gray-400" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnter}
      disabled={entering}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-brandPrimary-700 py-2 transition hover:bg-brandPrimary-600 disabled:opacity-70"
    >
      <span className="font-manrope text-[12px] font-bold text-white">
        {entering ? "Entrando…" : "Entrar"}
      </span>
      {!entering && <ArrowRight size={13} color="#fff" />}
    </button>
  );
}
