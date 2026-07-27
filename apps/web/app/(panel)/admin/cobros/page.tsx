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
// cuenta lo rechaza la base.

// React / Next
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// Librerías
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Info,
  Link2,
  Link2Off,
  ShieldAlert,
  Wallet,
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
        <div className="h-48 animate-pulse rounded-card border border-ui-input-border bg-white" />
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
      />

      <Suspense fallback={null}>
        <CallbackBanner />
      </Suspense>

      <div className="flex flex-col gap-5">
        {/* ── Paso 1: la cuenta ─────────────────────────────────────────── */}
        <section className="rounded-card border border-ui-input-border bg-white p-5 shadow-card-brand md:p-6">
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

        {/* ── Paso 2: el interruptor ────────────────────────────────────── */}
        <section
          className={`rounded-card border bg-white p-5 shadow-card-brand md:p-6 ${
            connected ? "border-ui-input-border" : "border-ui-input-border opacity-60"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">
                Pagos desde la app
              </h2>
              <p className="mt-1 max-w-prose font-manrope text-xs text-ui-text-muted">
                {connected
                  ? "Cuando está activo, cada socio ve el botón para pagar su cuota desde la app. Si hace más de una actividad, se le cobra todo junto."
                  : "Necesitás conectar tu cuenta de MercadoPago antes de habilitar los cobros."}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Habilitar cobros desde la app"
              disabled={!connected || toggleMutation.isPending}
              onClick={() => handleToggle(!enabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                enabled ? "bg-green-500" : "bg-ui-input-border"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {connected && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-ui-input-border bg-brandPrimary-50/40 px-3.5 py-3">
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
  );
}
