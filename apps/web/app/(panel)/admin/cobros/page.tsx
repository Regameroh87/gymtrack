"use client";

// Cobros online (admin): el dueño conecta la cuenta de MercadoPago del gimnasio
// y decide si sus socios pueden pagar la cuota desde la app.
//
// Hermana de admin/suscripcion, pero la flecha de la plata va al revés: allá la
// plataforma le cobra el abono al gym, acá el gym le cobra al socio y el dinero
// cae en la cuenta del gimnasio. Por eso hace falta conectar una cuenta propia
// en vez de usar el token de la plataforma.
//
// La pantalla expone DOS estados separados, que es como están modelados:
// "cuenta conectada" y "cobros prendidos". Se puede apagar el cobro sin
// desconectar —pausar sin perder el token ni rehacer el OAuth— pero prender sin
// cuenta lo rechaza la base. Por eso el flujo se presenta como dos pasos: el
// paso 2 depende del 1, y tiene que leerse así de un vistazo.

// React / Next
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// Librerías
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FlaskConical,
  Info,
  Link2,
  Link2Off,
  Lock,
  ShieldAlert,
  Wallet,
  Zap,
} from "lucide-react";

// Hooks de datos, contextos y helpers
import { useActiveGym } from "@/components/auth/active-gym-provider";
import {
  useDisconnectMercadoPago,
  useGymOnlinePayments,
  useToggleOnlinePayments,
} from "@/lib/hooks/use-gym-online-payments";
import { isOwnerRole } from "@/lib/auth/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Motivos con los que /api/gym-mp/callback devuelve al panel. El detalle técnico
// queda en el log del servidor: acá solo va lo accionable.
const CALLBACK_MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  conectado: {
    tone: "ok",
    text: "Cuenta de MercadoPago conectada. Ya podés habilitar los cobros.",
  },
  cancelado: {
    tone: "warn",
    text: "Cancelaste la autorización en MercadoPago. No se conectó ninguna cuenta.",
  },
  state_invalido: {
    tone: "warn",
    text: "El pedido de conexión venció o no coincide. Probá de nuevo desde este panel.",
  },
  sin_permiso: {
    tone: "warn",
    text: "No tenés permiso de dueño sobre este gimnasio.",
  },
  error: {
    tone: "warn",
    text: "No se pudo completar la conexión con MercadoPago. Probá de nuevo en unos minutos.",
  },
};

function CallbackBanner() {
  const status = useSearchParams().get("mp");
  const msg = status ? CALLBACK_MESSAGES[status] : null;
  if (!msg) return null;

  const ok = msg.tone === "ok";
  return (
    <div
      className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 ${
        ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={16} color="#16a34a" className="shrink-0" />
      ) : (
        <AlertCircle size={16} color="#d97706" className="shrink-0" />
      )}
      <p
        className={`font-manrope text-[13px] font-semibold ${
          ok ? "text-green-800" : "text-amber-800"
        }`}
      >
        {msg.text}
      </p>
    </div>
  );
}

// ── estado resumen (header) ──────────────────────────────────────────────────

function StatusPill({ connected, enabled }: { connected: boolean; enabled: boolean }) {
  const cfg = enabled
    ? { text: "Cobros activos", dot: "bg-green-500", wrap: "border-green-200 bg-green-50 text-green-700" }
    : connected
      ? { text: "Cobros pausados", dot: "bg-amber-500", wrap: "border-amber-200 bg-amber-50 text-amber-700" }
      : { text: "Sin conectar", dot: "bg-gray-400", wrap: "border-ui-input-border bg-gray-50 text-ui-text-muted" };

  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 font-manrope text-[11px] font-bold ${cfg.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  );
}

// ── el badge numerado + la línea que conecta los dos pasos ──────────────────

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-jakarta text-[13px] font-bold ${
        done ? "bg-brandSecondary-500 text-white" : "bg-brandPrimary-50 text-brandPrimary-700"
      }`}
    >
      {done ? <Check size={16} strokeWidth={3} /> : n}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function CobrosPage() {
  const { gymId, role } = useActiveGym();
  const { data, isLoading } = useGymOnlinePayments(gymId);
  const toggleMutation = useToggleOnlinePayments(gymId);
  const disconnectMutation = useDisconnectMercadoPago(gymId);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (!isOwnerRole(role)) {
    return (
      <div className="p-4 md:p-9">
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <ShieldAlert size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            Sin permiso
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            Los cobros online los administra solo el dueño del gimnasio.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 pb-14 md:p-9">
        <PageHeader section="Cobros" title="Cobros online" />
        <div className="h-64 animate-pulse rounded-card border border-ui-input-border bg-white" />
      </div>
    );
  }

  const { connected, enabled, mpUserId, connectedAt, liveMode } = data;

  function handleToggle(next: boolean) {
    toggleMutation.mutate(next, {
      onSuccess: () =>
        toast.success(
          next
            ? "Cobros online habilitados. Tus socios ya pueden pagar desde la app."
            : "Cobros online deshabilitados. Tu cuenta sigue conectada.",
        ),
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado"),
    });
  }

  function handleDisconnect() {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmDisconnect(false);
        toast.success("Cuenta de MercadoPago desconectada.");
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "No se pudo desconectar"),
    });
  }

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Cobros"
        title="Cobros online"
        description="Cobrales la cuota a tus socios desde la app. La plata entra directo a tu cuenta de MercadoPago."
        cta={<StatusPill connected={connected} enabled={enabled} />}
      />

      <Suspense fallback={null}>
        <CallbackBanner />
      </Suspense>

      <div className="relative flex flex-col gap-5">
        {/* Línea que conecta los dos badges de paso */}
        <div className="pointer-events-none absolute left-[17px] top-[52px] bottom-[52px] w-px bg-ui-input-border md:left-[35px]" />

        {/* ── Paso 1: la cuenta ─────────────────────────────────────────── */}
        <div className="flex gap-3.5 md:gap-4">
          <StepBadge n={1} done={connected} />
          <section className="flex-1 rounded-card border border-ui-input-border bg-white p-5 shadow-card-brand md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                    connected ? "bg-green-50" : "bg-brandPrimary-50"
                  }`}
                >
                  <Wallet size={19} color={connected ? "#16a34a" : "#2563eb"} />
                </div>
                <div>
                  <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">
                    Cuenta de MercadoPago
                  </h2>
                  {connected ? (
                    <p className="mt-1 font-manrope text-xs text-ui-text-muted">
                      Conectada el {fmt(connectedAt)}
                      {mpUserId && <> · Vendedor {mpUserId}</>}
                    </p>
                  ) : (
                    <p className="mt-1 max-w-prose font-manrope text-xs text-ui-text-muted">
                      Conectá la cuenta del gimnasio para empezar. Nosotros nunca
                      tocamos la plata: cada pago va directo a tu cuenta.
                    </p>
                  )}
                </div>
              </div>

              {connected ? (
                <Button
                  variant="secondary"
                  icon={<Link2Off size={15} />}
                  onClick={() => setConfirmDisconnect(true)}
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  icon={<Link2 size={15} />}
                  onClick={() => {
                    window.location.href = `/api/gym-mp/connect?gym_id=${gymId}`;
                  }}
                >
                  Conectar MercadoPago
                </Button>
              )}
            </div>

            {/* Una cuenta de prueba no cobra plata real. Si esto aparece en un gym
                productivo, es un error de configuración que hay que ver ya. */}
            {connected && !liveMode && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <FlaskConical size={15} color="#d97706" className="mt-0.5 shrink-0" />
                <p className="font-manrope text-xs text-amber-800">
                  Esta es una cuenta de <strong>prueba</strong> de MercadoPago. Los
                  pagos que reciba no son reales.
                </p>
              </div>
            )}

            {confirmDisconnect && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                <p className="font-manrope text-[13px] font-semibold text-red-800">
                  ¿Desconectar la cuenta?
                </p>
                <p className="mt-1 font-manrope text-xs text-red-700">
                  Los cobros online se apagan y tus socios dejan de poder pagar
                  desde la app. Para volver a activarlos vas a tener que autorizar
                  de nuevo en MercadoPago.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={disconnectMutation.isPending}
                    onClick={handleDisconnect}
                  >
                    Sí, desconectar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDisconnect(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Paso 2: el interruptor ────────────────────────────────────── */}
        <div className="flex gap-3.5 md:gap-4">
          <StepBadge n={2} done={enabled} />
          <section
            className={`flex-1 rounded-card border p-5 shadow-card-brand transition-colors md:p-6 ${
              enabled
                ? "border-green-200 bg-green-50/40"
                : connected
                  ? "border-ui-input-border bg-white"
                  : "border-dashed border-ui-input-border bg-gray-50/60"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                    enabled ? "bg-green-100" : connected ? "bg-brandPrimary-50" : "bg-gray-100"
                  }`}
                >
                  {connected ? (
                    <Zap size={19} color={enabled ? "#16a34a" : "#2563eb"} />
                  ) : (
                    <Lock size={17} color="#9ca3af" />
                  )}
                </div>
                <div>
                  <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">
                    Cobro a los socios
                  </h2>
                  <p className="mt-1 max-w-prose font-manrope text-xs text-ui-text-muted">
                    {connected
                      ? "Cuando está activo, cada socio ve el botón para pagar su cuota desde la app. Si hace más de una actividad, se le cobra todo junto."
                      : "Se desbloquea al conectar tu cuenta de MercadoPago en el paso 1."}
                  </p>
                </div>
              </div>

              {/* Interruptor grande con el estado escrito al lado: nada de
                  adivinar por el color solo. */}
              <div className="flex items-center gap-3 self-end md:self-center">
                <span
                  className={`font-manrope text-[12px] font-bold ${
                    !connected
                      ? "text-gray-400"
                      : enabled
                        ? "text-green-700"
                        : "text-ui-text-muted"
                  }`}
                >
                  {!connected ? "Bloqueado" : enabled ? "Activado" : "Desactivado"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label="Habilitar cobros desde la app"
                  disabled={!connected || toggleMutation.isPending}
                  onClick={() => handleToggle(!enabled)}
                  className={`relative h-8 w-[54px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
                    enabled ? "bg-green-500" : connected ? "bg-gray-300" : "bg-gray-200"
                  } ${toggleMutation.isPending ? "opacity-70" : ""}`}
                >
                  <span
                    className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-[27px]" : "translate-x-1"
                    }`}
                  >
                    {!connected && <Lock size={11} color="#9ca3af" />}
                    {connected && enabled && <Check size={12} color="#16a34a" strokeWidth={3} />}
                  </span>
                </button>
              </div>
            </div>

            {connected && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-ui-input-border bg-white px-3.5 py-3">
                <Info size={15} color="#2563eb" className="mt-0.5 shrink-0" />
                <p className="font-manrope text-xs text-ui-text-muted">
                  Apagarlo no desconecta tu cuenta: podés pausar los cobros y
                  volver a prenderlos cuando quieras, sin autorizar de nuevo.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
