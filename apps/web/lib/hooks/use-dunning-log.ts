// Historial de recordatorios de cobranza (gym_dunning_log), por mes.
//
// La escribe únicamente el job (cobranza-recordatorios, con service role); desde
// el browser es de solo lectura. La RLS gym_dunning_log_admin_select
// (is_admin_of) es la autoridad de permisos — este hook no reimplementa nada,
// igual que use-dunning-settings.
//
// queryKey propia y no la de use-dunning-settings: si compartieran clave,
// cambiar de mes acá invalidaría la configuración y los candidatos, que no
// dependen del mes.

import { useQuery } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type DunningLogStatus = "sent" | "skipped" | "failed";

export interface DunningLogEntry {
  id: string;
  userId: string;
  name: string | null;
  lastName: string | null;
  email: string | null;
  referenceDueDate: string;
  /**
   * Congelado por el job en el momento del envío. Se muestra este valor y NO se
   * joinea gym_dunning_steps a propósito: el step pudo haberse editado (otro
   * día) o borrado (step_id es on delete set null) después del envío, y en
   * cualquiera de los dos casos el join haría mentir al historial sobre lo que
   * realmente se mandó.
   */
  daysAfterDue: number;
  status: DunningLogStatus;
  /**
   * Motivo del skipped/failed. Ojo: el job también la llena en envíos exitosos
   * ("Enviado sin botón de pago: ..."), así que en pantalla es "Detalle", no
   * "Error" — ver cobranza-recordatorios/index.ts.
   */
  error: string | null;
  sentAt: string;
}

export interface DunningLogData {
  entries: DunningLogEntry[];
  /** Total del mes según PostgREST, que puede ser mayor que entries.length (ver PAGE_SIZE). */
  total: number;
  /** Filas en TODO el historial del gym. Distingue "nunca se mandó nada" de "este mes no hubo". */
  everTotal: number;
}

/**
 * Tope de filas traídas por mes. Con el volumen real (un puñado de mails por
 * día) no se alcanza nunca; está para que un gym grande no se traiga miles de
 * filas al browser sin querer. Cuando total > PAGE_SIZE la pantalla lo dice.
 */
export const PAGE_SIZE = 200;

interface Row {
  id: string;
  user_id: string;
  reference_due_date: string;
  days_after_due: number;
  status: DunningLogStatus;
  error: string | null;
  sent_at: string;
  member: { name: string | null; last_name: string | null; email: string | null } | null;
}

/**
 * Límites del mes anclados a Argentina (UTC-3), no a UTC.
 *
 * sent_at es timestamptz. Si los bordes se arman en UTC, un envío del 31/07
 * 21:30 ART (= 01/08 00:30 UTC) aparece en agosto. El job corre 09:00 ART y no
 * roza el borde, pero un envío manual sí.
 *
 * El corte de arriba es el primer día del mes SIGUIENTE y se compara con `lt`:
 * con `lte` contra el último día del mes se perdería todo lo enviado ese día
 * después de las 00:00.
 */
function monthBoundsAR(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const first = (y: number, m: number) => `${y}-${pad(m + 1)}-01T00:00:00-03:00`;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  return { from: first(year, month), to: first(nextYear, nextMonth) };
}

export function useDunningLog(gymId: string | null | undefined, year: number, month: number) {
  return useQuery({
    queryKey: ["gym_dunning_log", gymId, year, month],
    enabled: !!gymId,
    staleTime: 15_000,
    queryFn: async (): Promise<DunningLogData> => {
      const supabase = getBrowserSupabase();
      const { from, to } = monthBoundsAR(year, month);

      const [rowsRes, everRes] = await Promise.all([
        supabase
          .from("gym_dunning_log")
          .select(
            "id, user_id, reference_due_date, days_after_due, status, error, sent_at, " +
              "member:profiles!gym_dunning_log_user_id_fkey(name, last_name, email)",
            { count: "exact" },
          )
          .eq("gym_id", gymId!)
          .gte("sent_at", from)
          .lt("sent_at", to)
          .order("sent_at", { ascending: false })
          .range(0, PAGE_SIZE - 1),
        // head: true = solo el count, sin traer filas. Es lo que distingue el
        // "todavía no se mandó nunca nada" (que es el estado real hoy) del
        // "este mes no hubo envíos".
        supabase
          .from("gym_dunning_log")
          .select("id", { count: "exact", head: true })
          .eq("gym_id", gymId!),
      ]);

      if (rowsRes.error) throw rowsRes.error;
      if (everRes.error) throw everRes.error;

      const entries: DunningLogEntry[] = ((rowsRes.data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        name: r.member?.name ?? null,
        lastName: r.member?.last_name ?? null,
        email: r.member?.email ?? null,
        referenceDueDate: r.reference_due_date,
        daysAfterDue: r.days_after_due,
        status: r.status,
        error: r.error,
        sentAt: r.sent_at,
      }));

      return { entries, total: rowsRes.count ?? entries.length, everTotal: everRes.count ?? 0 };
    },
  });
}
