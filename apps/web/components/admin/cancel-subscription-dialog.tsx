"use client";

// Modal de baja de la suscripción SaaS. Sin confirmación por tipeo del slug (a
// diferencia de eliminar gym): la baja es reversible y no borra nada, así que
// alcanza con que la fecha de corte esté a la vista antes de confirmar.

import { useState } from "react";
import { Loader2, CalendarClock } from "lucide-react";

import {
  ModalShell,
  ErrorBanner,
  Field,
  Textarea,
  WebSelect,
} from "@/components/platform/catalog/catalog-ui";
import { CANCEL_REASONS } from "@/lib/saas/cancel-reasons";

const REASON_OPTIONS = CANCEL_REASONS.map((r) => ({
  value: r.value,
  label: r.label,
}));

export function CancelSubscriptionDialog({
  accessUntil,
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  /** Hasta cuándo va a seguir funcionando el gym. null = corte inmediato. */
  accessUntil: string | null;
  isPending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (vars: { reason?: string; feedback?: string }) => void;
}) {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");

  const untilLabel = accessUntil
    ? new Date(accessUntil).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ModalShell maxWidth={480} onClose={isPending ? () => {} : onCancel}>
      <h2 className="font-jakarta text-lg font-bold tracking-tight text-ui-text-main">
        Dar de baja la suscripción
      </h2>

      <p className="mt-2 font-manrope text-[13px] leading-5 text-ui-text-muted">
        No se te va a cobrar nunca más.{" "}
        {untilLabel
          ? "El gimnasio sigue funcionando con normalidad hasta que termine el período que ya pagaste."
          : "El acceso de escritura al gimnasio se corta al confirmar, porque no queda período pagado."}
      </p>

      {untilLabel && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <CalendarClock size={16} color="#d97706" className="shrink-0" />
          <p className="font-manrope text-[12px] leading-5 text-amber-800">
            Acceso completo hasta el <strong>{untilLabel}</strong>. Desde esa
            fecha el gimnasio queda en modo solo lectura.
          </p>
        </div>
      )}

      <p className="mt-3 font-manrope text-[12px] leading-5 text-ui-text-muted">
        Tus datos no se borran: socios, pagos y planes quedan guardados y podés
        reactivar cuando quieras.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="¿Por qué te vas? (opcional)">
          <WebSelect
            value={reason}
            onChange={setReason}
            options={REASON_OPTIONS}
            placeholder="Prefiero no decirlo"
          />
        </Field>

        <Field label="¿Algo más que quieras contarnos? (opcional)">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nos sirve para mejorar."
            maxLength={1000}
          />
        </Field>
      </div>

      <div className="mt-5">
        <ErrorBanner message={error} />
      </div>

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 rounded-[11px] border border-ui-input-border bg-white py-2.5 text-center font-manrope text-[13px] font-semibold text-ui-text-main transition hover:bg-ui-background-light disabled:opacity-60"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={() =>
            onConfirm({
              reason: reason || undefined,
              feedback: feedback.trim() || undefined,
            })
          }
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-red-600 py-2.5 font-manrope text-[13px] font-bold text-white transition hover:bg-red-700 active:scale-[0.97] disabled:opacity-60"
        >
          {isPending && (
            <Loader2 size={15} color="#fff" className="animate-spin" />
          )}
          {isPending ? "Dando de baja..." : "Confirmar baja"}
        </button>
      </div>
    </ModalShell>
  );
}
