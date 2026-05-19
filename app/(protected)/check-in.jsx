// React / React Native
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";

// Librerías
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// BD
import { supabase } from "../../src/database/supabase";

// Componentes / assets
import { ArrowLeft, QrCode, CheckCircle, X, Camera } from "../../assets/icons";

const BRAND_PRIMARY = "#4a44e4";
const BRAND_MINT = "#2ae8cc";

export default function CheckInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState("scanning"); // scanning | sending | success | duplicate | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScan = useCallback(
    async ({ data }) => {
      if (status !== "scanning") return;
      setStatus("sending");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      let token;
      try {
        const parsed = JSON.parse(data);
        token = parsed?.t;
      } catch {
        token = null;
      }
      if (!token) {
        setErrorMsg("Este código no es válido para el check-in.");
        setStatus("error");
        return;
      }

      const { data: res, error } = await supabase.rpc("check_in_with_qr", {
        p_token: token,
      });

      if (error) {
        setErrorMsg(error.message ?? "No se pudo registrar la asistencia.");
        setStatus("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => {}
        );
        return;
      }

      if (res?.status === "already_checked_in") {
        setStatus("duplicate");
      } else {
        setStatus("success");
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
    },
    [status]
  );

  const reset = () => {
    setErrorMsg("");
    setStatus("scanning");
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: "#0C0B14", paddingTop: insets.top }}
    >
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-white/8"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 18,
              height: 3,
              borderRadius: 2,
              backgroundColor: BRAND_MINT,
            }}
          />
          <Text className="text-[#2ae8cc] text-[10px] font-manrope-bold uppercase tracking-[2.2px]">
            Check-in
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera frame */}
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="w-full aspect-square rounded-[32px] overflow-hidden"
          style={{
            backgroundColor: "#1a1730",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {Platform.OS === "web" ? (
            <View className="flex-1 items-center justify-center px-6">
              <QrCode size={64} color="rgba(255,255,255,0.35)" />
              <Text className="text-white/70 text-center font-manrope mt-4">
                El scanner funciona desde la app móvil. Abrí GymTrack en tu
                teléfono para escanear el QR del kiosko.
              </Text>
            </View>
          ) : !permission ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={BRAND_PRIMARY} />
            </View>
          ) : !permission.granted ? (
            <View className="flex-1 items-center justify-center px-6">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(74,68,228,0.18)" }}
              >
                <Camera size={26} color="#fff" />
              </View>
              <Text className="text-white text-base font-jakarta-bold text-center mb-1">
                Permiso de cámara
              </Text>
              <Text className="text-white/60 text-sm font-manrope text-center mb-5">
                Necesitamos acceder a la cámara para escanear el QR del
                gimnasio.
              </Text>
              <Pressable
                onPress={requestPermission}
                className="px-5 py-3 rounded-xl"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Text className="text-white text-sm font-manrope-bold">
                  Permitir cámara
                </Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={status === "scanning" ? handleScan : undefined}
            >
              {/* Overlay marco */}
              <View className="flex-1 items-center justify-center">
                <View
                  style={{
                    width: "72%",
                    aspectRatio: 1,
                    borderWidth: 2,
                    borderColor: BRAND_MINT,
                    borderRadius: 24,
                    backgroundColor: "transparent",
                  }}
                />
              </View>
            </CameraView>
          )}
        </View>

        <Text className="text-white text-xl font-jakarta-bold mt-7 text-center">
          Apuntá al QR del kiosko
        </Text>
        <Text className="text-white/55 text-sm font-manrope mt-2 text-center">
          El código se detecta automáticamente
        </Text>
      </View>

      {/* Bottom hint */}
      <View
        className="flex-row items-center justify-center gap-2 mb-6"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <Text className="text-white/55 text-xs font-manrope">
          Listo para escanear
        </Text>
      </View>

      {/* Result overlay */}
      {status !== "scanning" && (
        <ResultOverlay
          status={status}
          message={errorMsg}
          onClose={() => router.back()}
          onRetry={reset}
        />
      )}
    </View>
  );
}

function ResultOverlay({ status, message, onClose, onRetry }) {
  const isSuccess = status === "success" || status === "duplicate";
  const config = {
    sending: {
      title: "Registrando...",
      sub: "",
      color: BRAND_PRIMARY,
      Icon: null,
    },
    success: {
      title: "¡Bienvenido!",
      sub: "Tu asistencia quedó registrada.",
      color: "#10b981",
      Icon: CheckCircle,
    },
    duplicate: {
      title: "Ya estás dentro",
      sub: "Hiciste check-in hace menos de 30 minutos.",
      color: BRAND_PRIMARY,
      Icon: CheckCircle,
    },
    error: {
      title: "No se pudo registrar",
      sub: message,
      color: "#ef4444",
      Icon: X,
    },
  }[status];

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{ backgroundColor: "rgba(12,11,20,0.92)" }}
    >
      <View
        className="w-full max-w-[360px] rounded-3xl p-7 items-center"
        style={{
          backgroundColor: "#161427",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <View
          className="w-20 h-20 rounded-3xl items-center justify-center mb-5"
          style={{ backgroundColor: `${config.color}22` }}
        >
          {config.Icon ? (
            <config.Icon size={40} color={config.color} />
          ) : (
            <ActivityIndicator size="large" color={config.color} />
          )}
        </View>
        <Text className="text-white text-2xl font-jakarta-bold text-center">
          {config.title}
        </Text>
        {!!config.sub && (
          <Text className="text-white/65 text-sm font-manrope text-center mt-2">
            {config.sub}
          </Text>
        )}

        {status !== "sending" && (
          <View className="flex-row gap-2 mt-6 w-full">
            {!isSuccess && (
              <Pressable
                onPress={onRetry}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <Text className="text-white text-sm font-manrope-bold">
                  Reintentar
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl items-center"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="text-white text-sm font-manrope-bold">
                Listo
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
