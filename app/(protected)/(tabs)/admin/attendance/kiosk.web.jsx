import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../../../../../src/database/supabase";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";

import { ArrowLeft, QrCode, Clock } from "../../../../../assets/icons";

const ROTATE_MS = 30_000;
const GRACE_MS = 5_000;

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

export default function AttendanceKioskWeb() {
  const router = useRouter();
  const { gymId } = useActiveGym();

  // Tick que dispara refetch cada ROTATE_MS
  const [tick, setTick] = useState(0);

  const {
    data: tokenInfo,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["qr_token", gymId, tick],
    enabled: !!gymId,
    retry: false,
    queryFn: async () => {
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
    staleTime: ROTATE_MS,
  });

  // Auto-rotación
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Countdown visible
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
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: "#0C0B14" }}
    >
      <LinearGradient
        colors={["rgba(74,68,228,0.25)", "rgba(12,11,20,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 480 }}
      />

      {/* Volver */}
      <Pressable
        onPress={() => router.push("/admin/attendance")}
        className="absolute top-6 left-6 flex-row items-center gap-2 px-3.5 py-2 rounded-[11px] bg-white/5 border border-white/10 hover:bg-white/10"
        style={{ cursor: "pointer" }}
      >
        <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
        <Text className="text-white/70 text-xs font-manrope-semi">Volver</Text>
      </Pressable>

      {/* Brand */}
      <View className="absolute top-6 right-6 flex-row items-center gap-2">
        <View
          style={{
            width: 28,
            height: 3,
            borderRadius: 2,
            backgroundColor: "#2dd4bf",
          }}
        />
        <Text className="text-[#2dd4bf] text-[10px] font-manrope-bold uppercase tracking-[2.2px]">
          GymTrack · Kiosko
        </Text>
      </View>

      {/* Kicker */}
      <View className="items-center mb-7">
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-2 h-2 rounded-full bg-emerald-400" />
          <Text className="text-white/60 text-[11px] font-manrope-bold uppercase tracking-[2.4px]">
            Check-in en vivo
          </Text>
        </View>
        <Text className="text-white text-[34px] font-jakarta-bold tracking-tight">
          Escaneá para entrar
        </Text>
        <Text className="text-white/55 text-sm font-manrope mt-2">
          Abrí la app GymTrack → Check-in → apuntá la cámara al código
        </Text>
      </View>

      {/* QR */}
      <View
        className="rounded-[28px] p-7 items-center justify-center"
        style={{
          backgroundColor: "#fff",
          shadowColor: "#4a44e4",
          shadowOpacity: 0.5,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 12 },
        }}
      >
        {queryError ? (
          <View
            style={{ width: 420, height: 420 }}
            className="items-center justify-center px-6"
          >
            <Text className="text-red-600 text-base font-jakarta-bold text-center mb-2">
              No se pudo generar el QR
            </Text>
            <Text className="text-ui-text-muted text-xs font-manrope text-center">
              {queryError.message}
            </Text>
            <Text className="text-ui-text-muted text-[11px] font-manrope text-center mt-3">
              Verificá que las migraciones estén aplicadas y que tu usuario
              tenga un `gym_id` asignado.
            </Text>
          </View>
        ) : !gymId ? (
          <View
            style={{ width: 420, height: 420 }}
            className="items-center justify-center px-6"
          >
            <Text className="text-red-600 text-base font-jakarta-bold text-center mb-2">
              Falta gym_id
            </Text>
            <Text className="text-ui-text-muted text-xs font-manrope text-center">
              No hay un gimnasio activo seleccionado. Elegí uno desde tu
              perfil.
            </Text>
          </View>
        ) : isLoading || !payload ? (
          <View
            style={{ width: 420, height: 420 }}
            className="items-center justify-center"
          >
            <ActivityIndicator size="large" color="#4a44e4" />
          </View>
        ) : (
          <QRCode
            value={payload}
            size={420}
            color="#0C0B14"
            backgroundColor="#ffffff"
            ecl="M"
          />
        )}
      </View>

      {/* Footer info */}
      <View className="mt-8 flex-row items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10">
        <Clock size={14} color="#2dd4bf" />
        <Text className="text-white/80 text-sm font-manrope-semi">
          Se actualiza en{" "}
          <Text className="font-jakarta-bold text-[#2dd4bf]">
            {secondsLeft}s
          </Text>
        </Text>
        <View className="w-px h-3 bg-white/15 mx-1" />
        <QrCode size={14} color="rgba(255,255,255,0.55)" />
        <Text className="text-white/55 text-[11px] font-manrope">
          El código rota cada 30s por seguridad
        </Text>
      </View>
    </View>
  );
}
