"use client";

// Cobranza automática (admin): cuántos recordatorios de cuota vencida se
// mandan, a los cuántos días del vencimiento, con qué mail — y un botón de
// pago de MercadoPago condicional por recordatorio. Un job diario
// (cobranza-recordatorios) es quien realmente los envía; esta pantalla
// configura y previsualiza, nunca manda nada ella misma salvo el botón
// explícito "Enviar prueba a mi mail".
//
// Mismo esqueleto que admin/cobros/page.tsx: guard de rol, PageHeader con
// StatusPill, skeleton mientras carga, Card/Button de components/ui, toast de
// sonner. A diferencia de Cobros online (ownerOnly), acá el pedido fue owner
// O admin — ver MODULE_ROLES.cobranza en @gymtrack/core/roles.

// React / Next
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { toast } from "sonner";
import {
  ShieldAlert,
  MailWarning,
  Plus,
  Trash2,
  RotateCcw,
  Send,
  Info,
  Users,
  Loader2,
  CreditCard,
} from "lucide-react";

// Hooks de datos, contextos y helpers
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { isAdminRole } from "@/lib/auth/roles";
import {
  useDunningSettings,
  useSaveDunningSettings,
  useCreateDunningStep,
  useUpdateDunningStep,
  useDeleteDunningStep,
  useRestoreDunningStep,
  type DunningStep,
} from "@/lib/hooks/use-dunning-settings";
import { useGymOnlinePayments } from "@/lib/hooks/use-gym-online-payments";
import { DUNNING_VARIABLES } from "@/lib/dunning-defaults";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── helpers ───────────────────────────────────────────────────────────────────

function daysLabel(n: number): string {
  if (n === 0) return "El mismo día del vencimiento";
  return `A los ${n} día${n === 1 ? "" : "s"} del vencimiento`;
}

function fmtMoneyARS(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function fmtDateAR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

interface DraftStep {
  subject: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
  showPaymentButton: boolean;
}

function draftFromStep(step: DunningStep): DraftStep {
  return {
    subject: step.subject,
    heading: step.heading,
    bodyText: step.bodyText,
    ctaLabel: step.ctaLabel,
    showPaymentButton: step.showPaymentButton,
  };
}

// ── estado resumen (header) ──────────────────────────────────────────────────

function StatusPill({ enabled }: { enabled: boolean }) {
  const cfg = enabled
    ? { text: "Cobranza activa", dot: "bg-green-500", wrap: "border-green-200 bg-green-50 text-green-700" }
    : { text: "Cobranza apagada", dot: "bg-gray-400", wrap: "border-ui-input-border bg-gray-50 text-ui-text-muted" };

  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 font-manrope text-[11px] font-bold ${cfg.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

/**
 * El reply-to viaja tal cual hasta Resend, que valida las direcciones y rechaza
 * el envío entero si no le cierra. O sea que un typo acá voltea toda la
 * cobranza y el owner recién lo ve en el historial. Mejor frenarlo en el
 * guardado, donde todavía se puede corregir.
 *
 * A propósito no se intenta validar el RFC completo: el caso real no es ese, es
 * la coma en lugar del punto o el @ que falta. Es la misma forma que usan los
 * formularios de gimnasio y que espeja el check de la tabla.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mensaje legible de lo que sea que haya tirado la query.
 *
 * `error instanceof Error` no alcanza: los errores de supabase-js son objetos
 * planos ({ message, details, hint, code }), no instancias de Error, así que la
 * pantalla mostraba "Error desconocido" justo cuando había algo para leer. Pasó
 * de verdad — un select contra una columna borrada devolvía 400 y el owner solo
 * veía el cartel genérico.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const { message, details } = err as { message?: unknown; details?: unknown };
    if (typeof message === "string" && message) {
      return typeof details === "string" && details ? `${message} (${details})` : message;
    }
  }
  return "Error desconocido";
}

export default function CobranzaPage() {
  const { gymId, role } = useActiveGym();
  const { data, isLoading, isError, error, refetch } = useDunningSettings(gymId);
  const { data: onlinePayments } = useGymOnlinePayments(gymId);

  const saveSettings = useSaveDunningSettings(gymId);
  const createStep = useCreateDunningStep(gymId);
  const updateStep = useUpdateDunningStep(gymId);
  const deleteStep = useDeleteDunningStep(gymId);
  const restoreStep = useRestoreDunningStep(gymId);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftStep | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [newStepDays, setNewStepDays] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const steps = useMemo(() => data?.steps ?? [], [data?.steps]);
  const candidates = data?.candidates ?? [];
  const gymEmail = data?.gymEmail ?? null;

  // Auto-selecciona el primer recordatorio al cargar (o al quedarse sin el
  // seleccionado, p.ej. lo borraron). No pisa una selección válida existente.
  useEffect(() => {
    if (steps.length === 0) {
      setSelectedStepId(null);
      return;
    }
    if (!selectedStepId || !steps.some((s) => s.id === selectedStepId)) {
      setSelectedStepId(steps[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  // Sincroniza el draft del canvas con el step seleccionado. Solo en el
  // cambio de selección o de cantidad de steps — no en cada refetch de fondo,
  // para no pisar lo que el owner está tipeando.
  useEffect(() => {
    const step = steps.find((s) => s.id === selectedStepId);
    if (step) setDraft(draftFromStep(step));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStepId, steps.length]);

  // Preview en vivo: debounce ~500ms contra /api/cobranza/preview, que llama
  // al mismo render que el envío real (send-email con preview:true).
  useEffect(() => {
    if (!draft || !gymId) return;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cobranza/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gym_id: gymId,
            subject: draft.subject,
            heading: draft.heading,
            body_text: draft.bodyText,
            cta_label: draft.ctaLabel,
            show_payment_button: draft.showPaymentButton,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setPreviewHtml(json.html ?? null);
          setPreviewError(null);
        } else {
          // Antes esto se descartaba: sin html el canvas quedaba con el spinner
          // puesto para siempre y el owner no tenía forma de saber que había
          // fallado. El mensaje del backend es el que dice qué configurar.
          setPreviewError(json.error ?? `La vista previa falló (${res.status}).`);
        }
      } catch (err) {
        // El preview es una ayuda visual: si falla, no bloquea el resto de la
        // pantalla — pero sí tiene que decir que falló.
        setPreviewError(err instanceof Error ? err.message : "No se pudo generar la vista previa.");
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [draft, gymId]);

  if (!isAdminRole(role)) {
    return (
      <div className="p-4 md:p-9">
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <ShieldAlert size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">Sin permiso</p>
          <p className="font-manrope text-xs text-ui-text-muted">
            La cobranza automática la administra el dueño o un administrador del gimnasio.
          </p>
        </div>
      </div>
    );
  }

  // El error va ANTES del skeleton y con su mensaje real. Colapsar los dos
  // estados en `isLoading || !data` deja la pantalla pulsando para siempre
  // cuando la query falla (react-query pone isLoading en false y data en
  // undefined), que es exactamente cómo se veía esta pantalla mientras faltaba
  // aplicar la migración: en blanco, sin decir qué pasaba. En una pantalla que
  // solo ve el owner, el mensaje de Postgres es la información útil.
  if (isError) {
    return (
      <div className="p-4 pb-14 md:p-9">
        <PageHeader section="Cobranza" title="Cobranza automática" />
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white px-6 py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <ShieldAlert size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            No se pudo cargar la cobranza
          </p>
          <p className="mb-5 max-w-prose text-center font-manrope text-xs text-ui-text-muted">
            {errorMessage(error)}
          </p>
          <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 pb-14 md:p-9">
        <PageHeader section="Cobranza" title="Cobranza automática" />
        <div className="h-64 animate-pulse rounded-card border border-ui-input-border bg-white" />
      </div>
    );
  }

  const { settings } = data;
  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;

  function handleToggle(enabled: boolean) {
    // Prender sin ningún Reply-To deja a los socios respondiéndole al noreply@.
    // Alcanza con cualquiera de los dos: el propio de la cobranza o, si está
    // vacío, el del gimnasio. Apagar siempre se puede: la traba no puede dejar
    // a nadie atrapado con la cobranza encendida.
    if (enabled && !settings.replyTo && !gymEmail) {
      toast.error("Cargá un mail para las respuestas antes de prender la cobranza.");
      return;
    }
    saveSettings.mutate(
      { enabled },
      {
        onSuccess: () =>
          toast.success(enabled ? "Cobranza automática habilitada." : "Cobranza automática deshabilitada."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado"),
      },
    );
  }

  function handleAddStep() {
    const days = Number(newStepDays);
    if (!Number.isFinite(days) || days < 0) {
      toast.error("Ingresá un número de días válido (0 o más).");
      return;
    }
    createStep.mutate(days, {
      onSuccess: ({ id, tpl }) => {
        setNewStepDays("");
        setSelectedStepId(id);
        setDraft({
          subject: tpl.subject,
          heading: tpl.heading,
          bodyText: tpl.body_text,
          ctaLabel: tpl.cta_label,
          showPaymentButton: tpl.show_payment_button,
        });
        toast.success("Recordatorio agregado.");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error && err.message.includes("duplicate")
            ? "Ya hay un recordatorio configurado para ese día."
            : err instanceof Error
              ? err.message
              : "No se pudo agregar el recordatorio",
        ),
    });
  }

  function handleDeleteStep(id: string) {
    deleteStep.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        toast.success("Recordatorio eliminado.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo eliminar"),
    });
  }

  function handleSaveDraft() {
    if (!selectedStep || !draft) return;
    updateStep.mutate(
      { id: selectedStep.id, patch: draft },
      {
        onSuccess: () => toast.success("Recordatorio guardado."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo guardar"),
      },
    );
  }

  function handleRestore() {
    if (!selectedStep) return;
    restoreStep.mutate(selectedStep.id, {
      onSuccess: (tpl) => {
        setDraft({
          subject: tpl.subject,
          heading: tpl.heading,
          bodyText: tpl.body_text,
          ctaLabel: tpl.cta_label,
          showPaymentButton: tpl.show_payment_button,
        });
        toast.success("Se restauró la plantilla por defecto.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo restaurar"),
    });
  }

  async function handleSendTest() {
    if (!gymId || !draft) return;
    setSendingTest(true);
    try {
      const res = await fetch("/api/cobranza/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gym_id: gymId,
          subject: draft.subject,
          heading: draft.heading,
          body_text: draft.bodyText,
          cta_label: draft.ctaLabel,
          show_payment_button: draft.showPaymentButton,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "No se pudo enviar el mail de prueba");
      toast.success(`Mail de prueba enviado a ${json.to}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el mail de prueba");
    } finally {
      setSendingTest(false);
    }
  }

  // Candidatos agrupados por el step que les tocaría hoy (coincidencia exacta
  // días de atraso ↔ days_after_due, mismo criterio que el job).
  const candidatesByStep = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const step = steps.find((s) => s.active && s.daysAfterDue === c.daysOverdue);
    if (!step) continue;
    candidatesByStep.set(step.id, [...(candidatesByStep.get(step.id) ?? []), c]);
  }
  const totalToday = [...candidatesByStep.values()].reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Cobranza"
        title="Cobranza automática"
        description="Configurá los recordatorios de cuota vencida que se mandan solos por mail, con link de pago de MercadoPago."
        cta={<StatusPill enabled={settings.enabled} />}
      />

      <div className="flex flex-col gap-5">
        {/* ── Bloque 1: interruptor + estado ─────────────────────────────── */}
        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                  settings.enabled ? "bg-green-50" : "bg-gray-100"
                }`}
              >
                <MailWarning size={19} color={settings.enabled ? "#16a34a" : "#9ca3af"} />
              </div>
              <div>
                <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">Recordatorios automáticos</h2>
                <p className="mt-1 max-w-prose font-manrope text-xs text-ui-text-muted">
                  Cuando está activo, el job diario les manda un mail a los socios con cuotas vencidas según los
                  recordatorios configurados abajo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <span
                className={`font-manrope text-[12px] font-bold ${settings.enabled ? "text-green-700" : "text-ui-text-muted"}`}
              >
                {settings.enabled ? "Activado" : "Desactivado"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                aria-label="Habilitar cobranza automática"
                disabled={saveSettings.isPending}
                onClick={() => handleToggle(!settings.enabled)}
                className={`relative h-8 w-[54px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
                  settings.enabled ? "bg-green-500" : "bg-gray-300"
                } ${saveSettings.isPending ? "opacity-70" : ""}`}
              >
                <span
                  className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
                    settings.enabled ? "translate-x-[27px]" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {!onlinePayments?.enabled && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <Info size={15} color="#d97706" className="mt-0.5 shrink-0" />
              <p className="font-manrope text-xs text-amber-800">
                Este gimnasio no tiene los cobros online habilitados: los recordatorios van a salir{" "}
                <strong>sin</strong> botón de pago hasta que conectes MercadoPago en{" "}
                <Link href="/admin/cobros" className="font-bold underline">
                  Cobros online
                </Link>
                .
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-ui-input-border pt-4 md:grid-cols-2">
            <div>
              <label className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                Días mínimos antes de repetir el mismo recordatorio
              </label>
              <input
                type="number"
                min={0}
                defaultValue={settings.cooldownDays}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0 && v !== settings.cooldownDays) {
                    saveSettings.mutate({ cooldownDays: v });
                  }
                }}
                className="mt-1.5 w-full rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
              />
              <p className="mt-1 font-manrope text-[11px] text-ui-text-muted">
                Red de seguridad para pagos parciales: si un socio paga una de sus cuotas, evita que le vuelva a
                llegar <strong>el mismo</strong> recordatorio por lo que queda. <strong>No afecta la escalada</strong>
                : pasar de un recordatorio al siguiente nunca se frena por esto.
              </p>
            </div>
            <div>
              <label className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                Mail para las respuestas
              </label>
              <input
                type="email"
                // Vacío = usar el del gimnasio. El placeholder muestra cuál es,
                // así el campo en blanco no se lee como "no hay ninguno".
                placeholder={gymEmail ?? "Cargá el mail de contacto del gimnasio"}
                defaultValue={settings.replyTo ?? ""}
                onBlur={(e) => {
                  const v = e.target.value.trim() || null;
                  if (v === settings.replyTo) return;
                  // Vaciarlo es válido: vuelve a usar el del gimnasio.
                  if (v !== null && !EMAIL_RE.test(v)) {
                    toast.error("Ese mail no parece válido. Revisalo, si no los recordatorios no van a salir.");
                    return;
                  }
                  saveSettings.mutate(
                    { replyTo: v },
                    {
                      onSuccess: () =>
                        toast.success(v ? "Mail para las respuestas guardado." : `Vuelve a usarse ${gymEmail}.`),
                      onError: (err) => toast.error(errorMessage(err)),
                    },
                  );
                }}
                className="mt-1.5 w-full rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
              />
              <p className="mt-1 font-manrope text-[11px] text-ui-text-muted">
                Adonde le contestan los socios. Los recordatorios salen desde el <strong>noreply@</strong> de la
                plataforma, así que sin esto las respuestas no llegan a nadie.{" "}
                {gymEmail ? (
                  <>
                    Vacío usa el mail de contacto del gimnasio (<strong>{gymEmail}</strong>); completalo solo si querés
                    que las respuestas de cobranza vayan a otra casilla.
                  </>
                ) : (
                  <span className="text-red-600">
                    El gimnasio no tiene mail de contacto cargado, así que hace falta uno acá para poder prender la
                    cobranza.
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* ── Bloque 2: recordatorios ─────────────────────────────────────── */}
        <Card>
          <h2 className="mb-1 font-jakarta text-[15px] font-bold text-ui-text-main">Recordatorios</h2>
          <p className="mb-4 font-manrope text-xs text-ui-text-muted">
            Uno por cada tanda de días de atraso. Hacé clic en uno para editar su mail abajo.
          </p>

          <div className="flex flex-col gap-2">
            {steps.length === 0 && (
              <p className="rounded-xl border border-dashed border-ui-input-border py-6 text-center font-manrope text-xs text-ui-text-muted">
                Todavía no configuraste ningún recordatorio.
              </p>
            )}

            {steps.map((step) => (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition ${
                  step.id === selectedStepId
                    ? "border-brandPrimary-600 bg-brandPrimary-50/50"
                    : "border-ui-input-border bg-white hover:bg-brandPrimary-50/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-manrope text-[13px] font-bold text-ui-text-main">{daysLabel(step.daysAfterDue)}</p>
                  <p className="truncate font-manrope text-[11px] text-ui-text-muted">{step.subject}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!step.showPaymentButton && (
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wide text-ui-text-muted">
                      Sin botón
                    </span>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={step.active}
                    aria-label="Recordatorio activo"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStep.mutate({ id: step.id, patch: { active: !step.active } });
                    }}
                    className={`relative h-6 w-[42px] shrink-0 rounded-full transition-colors ${
                      step.active ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        step.active ? "translate-x-[21px]" : "translate-x-1"
                      }`}
                    />
                  </button>

                  {confirmDeleteId === step.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteStep(step.id)}>
                        Sí
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label="Eliminar recordatorio"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(step.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-ui-input-border pt-4">
            <input
              type="number"
              min={0}
              placeholder="Días de atraso"
              value={newStepDays}
              onChange={(e) => setNewStepDays(e.target.value)}
              className="w-40 rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              loading={createStep.isPending}
              onClick={handleAddStep}
            >
              Agregar recordatorio
            </Button>
          </div>
        </Card>

        {/* ── Bloque 3: canvas del mail ───────────────────────────────────── */}
        {selectedStep && draft && (
          <Card padding="p-0">
            <div className="flex items-center justify-between border-b border-ui-input-border p-5">
              <div>
                <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">
                  Mail — {daysLabel(selectedStep.daysAfterDue)}
                </h2>
                <p className="mt-1 font-manrope text-xs text-ui-text-muted">
                  El preview de la derecha es el mail real, con el logo y los colores de tu gimnasio.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  loading={restoreStep.isPending}
                  onClick={handleRestore}
                >
                  Restaurar plantilla
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  disabled={sendingTest}
                  onClick={handleSendTest}
                >
                  Enviar prueba a mi mail
                </Button>
                <Button size="sm" loading={updateStep.isPending} onClick={handleSaveDraft}>
                  Guardar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              {/* Izquierda: campos */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                    Asunto
                  </label>
                  <input
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
                  />
                </div>

                <div>
                  <label className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                    Título
                  </label>
                  <input
                    value={draft.heading}
                    onChange={(e) => setDraft({ ...draft, heading: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
                  />
                </div>

                <div>
                  <label className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                    Mensaje
                  </label>
                  <textarea
                    rows={6}
                    value={draft.bodyText}
                    onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
                    className="mt-1.5 w-full resize-none rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DUNNING_VARIABLES.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        title={v.label}
                        onClick={() => setDraft({ ...draft, bodyText: `${draft.bodyText}${v.token}` })}
                        className="rounded-md border border-ui-input-border bg-white px-2 py-1 font-manrope text-[10px] font-semibold text-brandPrimary-600 hover:bg-brandPrimary-50"
                      >
                        {v.token}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                    Texto del botón
                  </label>
                  <input
                    value={draft.ctaLabel}
                    onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                    disabled={!draft.showPaymentButton}
                    className="mt-1.5 w-full rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none disabled:bg-gray-50 disabled:text-ui-text-muted"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-ui-input-border bg-white px-3.5 py-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={15} color="#2563eb" />
                    <span className="font-manrope text-xs font-semibold text-ui-text-main">
                      Incluir botón de pago con MercadoPago
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.showPaymentButton}
                    onClick={() => setDraft({ ...draft, showPaymentButton: !draft.showPaymentButton })}
                    className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors ${
                      draft.showPaymentButton ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        draft.showPaymentButton ? "translate-x-[23px]" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Derecha: preview real */}
              <div className="flex flex-col">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
                    Vista previa
                  </span>
                  {previewLoading && <Loader2 size={12} className="animate-spin text-ui-text-muted" />}
                </div>
                <div className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-ui-input-border bg-gray-50">
                  {/* El error va PRIMERO, incluso si quedó un html viejo: si la
                      última vista previa falló, lo que se ve en pantalla ya no
                      corresponde a lo que el owner está editando, y mostrarlo
                      como si nada sería peor que decir que falló. */}
                  {previewError ? (
                    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
                        <MailWarning size={20} color="#d97706" />
                      </div>
                      <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
                        No se pudo generar la vista previa
                      </p>
                      <p className="max-w-prose text-center font-manrope text-xs text-ui-text-muted">
                        {previewError}
                      </p>
                    </div>
                  ) : previewHtml ? (
                    <iframe
                      title="Vista previa del mail"
                      srcDoc={previewHtml}
                      sandbox=""
                      className="h-full min-h-[420px] w-full"
                    />
                  ) : (
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-ui-text-muted" />
                    </div>
                  )}
                </div>
                {/* El botón de pago acá no lleva a ningún lado, y sin este aviso
                    la única forma de enterarse es clickeándolo. */}
                {draft.showPaymentButton && (
                  <p className="mt-2 font-manrope text-[11px] leading-relaxed text-ui-text-muted">
                    En la vista previa y en el mail de prueba el botón de pago no
                    funciona: el link de MercadoPago se genera al enviar, uno por
                    socio y contra su deuda real.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── Bloque 4: a quién le llegaría hoy ─────────────────────────────── */}
        <Card>
          <div className="mb-4 flex items-center gap-2.5">
            <Users size={16} color="#6b7280" />
            <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">Hoy le llegaría a...</h2>
            <span className="rounded-full bg-brandPrimary-50 px-2 py-0.5 font-manrope text-[11px] font-bold text-brandPrimary-600">
              {totalToday}
            </span>
          </div>

          {totalToday === 0 ? (
            <p className="rounded-xl border border-dashed border-ui-input-border py-6 text-center font-manrope text-xs text-ui-text-muted">
              Con la deuda actual, ningún recordatorio dispararía hoy.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {steps
                .filter((s) => candidatesByStep.has(s.id))
                .map((step) => (
                  <div key={step.id}>
                    <p className="mb-2 font-manrope text-[11px] font-bold uppercase tracking-wide text-ui-text-muted">
                      {daysLabel(step.daysAfterDue)} ({candidatesByStep.get(step.id)?.length ?? 0})
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-ui-input-border">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-ui-input-border bg-gray-50">
                            <th className="px-3.5 py-2 font-manrope text-[10px] font-bold uppercase tracking-wide text-ui-text-muted">
                              Socio
                            </th>
                            <th className="px-3.5 py-2 font-manrope text-[10px] font-bold uppercase tracking-wide text-ui-text-muted">
                              Vencimiento
                            </th>
                            <th className="px-3.5 py-2 font-manrope text-[10px] font-bold uppercase tracking-wide text-ui-text-muted">
                              Atraso
                            </th>
                            <th className="px-3.5 py-2 text-right font-manrope text-[10px] font-bold uppercase tracking-wide text-ui-text-muted">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(candidatesByStep.get(step.id) ?? []).map((c) => (
                            <tr key={c.userId} className="border-b border-ui-input-border last:border-0">
                              <td className="px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main">
                                {[c.name, c.lastName].filter(Boolean).join(" ") || c.email || "—"}
                              </td>
                              <td className="px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-muted">
                                {fmtDateAR(c.referenceDueDate)}
                              </td>
                              <td className="px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-muted">
                                {c.daysOverdue} día{c.daysOverdue === 1 ? "" : "s"}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-manrope text-[13px] font-bold text-ui-text-main">
                                {fmtMoneyARS(c.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
