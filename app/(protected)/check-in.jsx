// React / React Native
import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";

// Librerías
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// BD
import { supabase } from "../../src/database/supabase";

// Componentes / assets
import { ArrowLeft, QrCode, CheckCircle, X, Camera } from "../../assets/icons";

const BRAND_PRIMARY = "#4a44e4";
const BRAND_MINT = "#2ae8cc";

const makeDecoderHtml = (base64) => `<!DOCTYPE html><html><head>
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
</head><body><canvas id="c"></canvas><script>
var img=new Image();
img.onload=function(){
  var c=document.getElementById('c');
  c.width=img.naturalWidth;c.height=img.naturalHeight;
  var ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  var d=ctx.getImageData(0,0,c.width,c.height);
  var code=jsQR(d.data,d.width,d.height);
  window.ReactNativeWebView.postMessage(JSON.stringify({result:code?code.data:null}));
};
img.onerror=function(){window.ReactNativeWebView.postMessage(JSON.stringify({result:null}));};
img.src='data:image/jpeg;base64,${base64}';
</script></body></html>`;

export default function CheckInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("scanning"); // scanning | decoding | sending | success | duplicate | error
  const [errorMsg, setErrorMsg] = useState("");
  const [qrBase64, setQrBase64] = useState(null);

  const handleScan = useCallback(
    async ({ data }) => {
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
    []
  );

  const openCamera = async () => {
    const { status: permStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    if (permStatus !== "granted") {
      setErrorMsg("Se necesita permiso de cámara para escanear el QR.");
      setStatus("error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setStatus("decoding");
      setQrBase64(result.assets[0].base64);
    }
  };

  const handleWebViewMessage = useCallback(
    (event) => {
      const { result } = JSON.parse(event.nativeEvent.data);
      setQrBase64(null);
      if (result) {
        handleScan({ data: result });
      } else {
        setErrorMsg("No se detectó ningún QR. Intentá de nuevo.");
        setStatus("error");
      }
    },
    [handleScan]
  );

  const reset = () => {
    setErrorMsg("");
    setQrBase64(null);
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
          className="w-10 h-10 rounded-full items-center justify-center"
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

      {/* Scanner frame */}
      <View className="flex-1 items-center justify-center px-6">
        <View
          className="w-full aspect-square rounded-[32px] overflow-hidden items-center justify-center"
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
          ) : status === "decoding" ? (
            <View className="items-center gap-4">
              <ActivityIndicator size="large" color={BRAND_MINT} />
              <Text className="text-white/70 text-sm font-manrope">
                Leyendo código QR...
              </Text>
            </View>
          ) : (
            <View className="items-center gap-6 px-8">
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderWidth: 2,
                  borderColor: BRAND_MINT,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QrCode size={56} color="rgba(255,255,255,0.35)" />
              </View>
              <Pressable
                onPress={openCamera}
                className="flex-row items-center gap-2 px-6 py-3 rounded-2xl"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Camera size={18} color="#fff" />
                <Text className="text-white text-sm font-manrope-bold">
                  Escanear QR
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text className="text-white text-xl font-jakarta-bold mt-7 text-center">
          Apuntá al QR del kiosko
        </Text>
        <Text className="text-white/55 text-sm font-manrope mt-2 text-center">
          Tocá el botón y apuntá la cámara al código
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
      {status !== "scanning" && status !== "decoding" && (
        <ResultOverlay
          status={status}
          message={errorMsg}
          onClose={() => router.back()}
          onRetry={reset}
        />
      )}

      {/* WebView oculto para decodificar el QR */}
      {qrBase64 && (
        <WebView
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            top: -9999,
          }}
          source={{ html: makeDecoderHtml(qrBase64) }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          originWhitelist={["*"]}
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
