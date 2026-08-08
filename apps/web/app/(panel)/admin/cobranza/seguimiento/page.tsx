"use client";

// Seguimiento de cobranza (/admin/cobranza/seguimiento). Dos tarjetas, una por
// cada lado del tiempo: a quién le llegaría un recordatorio hoy (proyección) y
// qué se mandó realmente (historial, en CobranzaHistorial).
//
// Estaba dentro de la pantalla de configuración, como un bloque más abajo de
// todo. Se separó porque son dos cosas distintas: configurar la escalada es algo
// que el owner hace una vez y no vuelve a tocar, mientras que mirar quién debe
// es la consulta de todos los días. Tenerlas juntas obligaba a bajar por tres
// bloques de configuración para llegar a lo único que cambia solo.
//
// Comparte la query con la pantalla de configuración (useDunningSettings, misma
// queryKey), así que moverse entre las dos pestañas no dispara un refetch: react
// query sirve la caché mientras revalida.

import { ShieldAlert, RotateCcw, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CobranzaTabs } from "@/components/panel/cobranza-tabs";
import { CobranzaHistorial } from "@/components/panel/cobranza-historial";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { isAdminRole } from "@/lib/auth/roles";
import { useDunningSettings } from "@/lib/hooks/use-dunning-settings";
import { daysLabel, fmtDateAR, fmtMoneyARS, errorMessage } from "@/lib/cobranza/format";

export default function CobranzaSeguimientoPage() {
  const { gymId, role } = useActiveGym();
  const { data, isLoading, isError, error, refetch } = useDunningSettings(gymId);

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

  // Mismo criterio que la pantalla de configuración: el error va ANTES del
  // skeleton y con su mensaje real. Colapsar los dos estados deja la pantalla
  // pulsando para siempre cuando la query falla.
  if (isError) {
    return (
      <div className="p-4 pb-14 md:p-9">
        <PageHeader section="Cobranza" title="Seguimiento" />
        <CobranzaTabs />
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white px-6 py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <ShieldAlert size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            No se pudo cargar el seguimiento
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
        <PageHeader section="Cobranza" title="Seguimiento" />
        <CobranzaTabs />
        <div className="h-64 animate-pulse rounded-card border border-ui-input-border bg-white" />
      </div>
    );
  }

  const { steps, candidates } = data;

  // Un socio cae en el escalón cuyo days_after_due coincide EXACTO con su
  // atraso, igual que en el job: cualquier otro criterio mostraría acá algo
  // distinto de lo que va a salir mañana, que es justo lo que esta pantalla
  // tiene que evitar.
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
        title="Seguimiento"
        description="A quién le llegaría un recordatorio hoy y qué se mandó realmente, con el motivo de cada envío salteado o fallido."
      />
      <CobranzaTabs />

      <div className="flex flex-col gap-5">
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

        <CobranzaHistorial gymId={gymId} />
      </div>
    </div>
  );
}
