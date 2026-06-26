"use client";

// Kiosko de check-in por QR (admin). Clon de apps/mobile admin/attendance/kiosk.web.jsx:
// genera un token rotativo (gym_qr_tokens) cada 30s, lo muestra como QR a pantalla
// completa con countdown. El socio escanea desde la app.

// React / Next
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, QrCode, Clock, Loader2 } from "lucide-react";

// Supabase y contexto
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useActiveGym } from "@/components/auth/active-gym-provider";

const ROTATE_MS = 30_000;
const GRACE_MS = 5_000;

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

export default function AttendanceKioskPage() {
  const { gymId } = useActiveGym();

  // Tick que dispara refetch cada ROTATE_MS.
  const [tick, setTick] = useState(0);

  const {
    data: tokenInfo,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["qr_token", gymId, tick],
    enabled: !!gymId,
    retry: false,
    staleTime: ROTATE_MS,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const token = randomToken();
      const expiresAt = new Date(Date.now() + ROTATE_MS + GRACE_MS);
      const { error } = await supabase.from("gym_qr_tokens").insert({
        token,
        gym_id: gymId,
        expires_at: expiresAt.toISOString(),
      });
      if (error) {
        console.error("[kiosk] insert gym_qr_tokens failed:", error);
        throw error;
      }
      return { token, expiresAt: expiresAt.getTime() };
    },
  });

  // Auto-rotación.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Countdown visible.
  const [secondsLeft, setSecondsLeft] = useState(ROTATE_MS / 1000);
  useEffect(() => {
    if (!tokenInfo) return;
    const id = setInterval(() => {
      const ms = tokenInfo.expiresAt - GRACE_MS - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [tokenInfo]);

  const payload = useMemo(() => {
    if (!tokenInfo || !gymId) return null;
    return JSON.stringify({ t: tokenInfo.token, g: gymId });
  }, [tokenInfo, gymId]);

  return (
    <div
      className="relative flex flex-col min-h-screen items-center justify-center"
      style={{ backgroundColor: "#0C0B14" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(74,68,228,0.25), rgba(12,11,20,0))",
        }}
      />

      {/* Volver */}
      <Link
        href="/admin/attendance"
        className="absolute left-6 top-6 flex items-center gap-2 rounded-[11px] border border-white/10 bg-white/5 px-3.5 py-2 hover:bg-white/10"
      >
        <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
        <span className="font-manrope text-xs font-semibold text-white/70">
          Volver
        </span>
      </Link>

      {/* Brand */}
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <span
          style={{
            width: 28,
            height: 3,
            borderRadius: 2,
            backgroundColor: "#2dd4bf",
          }}
        />
        <span className="font-manrope text-[10px] font-bold uppercase tracking-[2.2px] text-[#2dd4bf]">
          GymTrack · Kiosko
        </span>
      </div>

      {/* Kicker */}
      <div className="mb-7 flex flex-col items-center">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-manrope text-[11px] font-bold uppercase tracking-[2.4px] text-white/60">
            Check-in en vivo
          </span>
        </div>
        <h1 className="font-jakarta text-[34px] font-bold tracking-tight text-white">
          Escaneá para entrar
        </h1>
        <p className="mt-2 font-manrope text-sm text-white/55">
          Abrí la app GymTrack → Check-in → apuntá la cámara al código
        </p>
      </div>

      {/* QR */}
      <div
        className="flex items-center justify-center rounded-[28px] bg-white p-7"
        style={{ boxShadow: "0 12px 32px rgba(74,68,228,0.5)" }}
      >
        {queryError ? (
          <div
            className="flex flex-col items-center justify-center px-6"
            style={{ width: 420, height: 420 }}
          >
            <p className="mb-2 text-center font-jakarta text-base font-bold text-red-600">
              No se pudo generar el QR
            </p>
            <p className="text-center font-manrope text-xs text-ui-text-muted">
              {(queryError as Error).message}
            </p>
            <p className="mt-3 text-center font-manrope text-[11px] text-ui-text-muted">
              Verificá que las migraciones estén aplicadas y que tu usuario
              tenga un `gym_id` asignado.
            </p>
          </div>
        ) : !gymId ? (
          <div
            className="flex flex-col items-center justify-center px-6"
            style={{ width: 420, height: 420 }}
          >
            <p className="mb-2 text-center font-jakarta text-base font-bold text-red-600">
              Falta gym_id
            </p>
            <p className="text-center font-manrope text-xs text-ui-text-muted">
              No hay un gimnasio activo seleccionado. Elegí uno desde tu perfil.
            </p>
          </div>
        ) : isLoading || !payload ? (
          <div
            className="flex items-center justify-center"
            style={{ width: 420, height: 420 }}
          >
            <Loader2 size={48} color="#4a44e4" className="animate-spin" />
          </div>
        ) : (
          <QRCodeSVG
            value={payload}
            size={420}
            fgColor="#0C0B14"
            bgColor="#ffffff"
            level="M"
          />
        )}
      </div>

      {/* Footer info */}
      <div className="mt-8 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3">
        <Clock size={14} color="#2dd4bf" />
        <span className="font-manrope text-sm font-semibold text-white/80">
          Se actualiza en{" "}
          <span className="font-jakarta font-bold text-[#2dd4bf]">
            {secondsLeft}s
          </span>
        </span>
        <span className="mx-1 h-3 w-px bg-white/15" />
        <QrCode size={14} color="rgba(255,255,255,0.55)" />
        <span className="font-manrope text-[11px] text-white/55">
          El código rota cada 30s por seguridad
        </span>
      </div>
    </div>
  );
}
