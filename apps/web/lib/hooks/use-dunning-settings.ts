// Cobranza automática (/admin/cobranza): configuración, recordatorios y a
// quién le llegaría hoy. Mismo estilo que use-gym-online-payments.ts: react
// query + supabase-js del browser, la RLS (is_admin_of) es la autoridad real
// — este hook no reimplementa ningún permiso, solo lee/escribe lo que la
// política ya deja pasar.
//
// Las tres tablas (settings, steps, log) están en la migración 20260802120000.
// gym_dunning_settings puede no tener fila todavía (se siembra recién cuando
// el owner guarda algo por primera vez): sin fila, se muestran los defaults
// "apagado, cooldown 3 días" en vez de un estado de carga infinito.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { defaultDunningStep } from "@/lib/dunning-defaults";

export interface DunningSettings {
  enabled: boolean;
  cooldownDays: number;
}

export interface DunningStep {
  id: string;
  daysAfterDue: number;
  subject: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
  showPaymentButton: boolean;
  active: boolean;
}

export interface DunningCandidate {
  userId: string;
  email: string | null;
  name: string | null;
  lastName: string | null;
  referenceDueDate: string;
  daysOverdue: number;
  totalAmount: number;
  items: number;
}

export interface DunningData {
  settings: DunningSettings;
  steps: DunningStep[];
  candidates: DunningCandidate[];
  /**
   * Mail de contacto del gimnasio (gyms.email). Es el Reply-To de los mails de
   * cobranza y es obligatorio para poder prenderla: sin él, las respuestas de
   * los socios caen en el noreply@ de la plataforma, que no lee nadie. No se
   * configura desde esta pantalla — se lee para poder bloquear el interruptor.
   */
  gymEmail: string | null;
}

const DEFAULT_SETTINGS: DunningSettings = { enabled: false, cooldownDays: 3 };

const queryKey = (gymId: string | null | undefined) => ["gym_dunning", gymId];

export function useDunningSettings(gymId: string | null | undefined) {
  return useQuery({
    queryKey: queryKey(gymId),
    enabled: !!gymId,
    staleTime: 15_000,
    queryFn: async (): Promise<DunningData> => {
      const supabase = getBrowserSupabase();

      const [settingsRes, stepsRes, candidatesRes, gymRes] = await Promise.all([
        supabase
          .from("gym_dunning_settings")
          .select("enabled, cooldown_days")
          .eq("gym_id", gymId!)
          .maybeSingle(),
        supabase
          .from("gym_dunning_steps")
          .select("id, days_after_due, subject, heading, body_text, cta_label, show_payment_button, active")
          .eq("gym_id", gymId!)
          .order("days_after_due", { ascending: true }),
        // gym_dunning_candidates es SECURITY DEFINER con guard is_admin_of
        // adentro: si el caller no es admin de este gym, la RPC misma lo
        // rechaza. No hay nada que este hook tenga que validar de más.
        supabase.rpc("gym_dunning_candidates", { p_gym_id: gymId! }),
        supabase.from("gyms").select("email").eq("id", gymId!).maybeSingle(),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (stepsRes.error) throw stepsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;
      if (gymRes.error) throw gymRes.error;

      const settings: DunningSettings = settingsRes.data
        ? {
            enabled: settingsRes.data.enabled,
            cooldownDays: settingsRes.data.cooldown_days,
          }
        : DEFAULT_SETTINGS;

      const steps: DunningStep[] = (stepsRes.data ?? []).map((s) => ({
        id: s.id,
        daysAfterDue: s.days_after_due,
        subject: s.subject,
        heading: s.heading,
        bodyText: s.body_text,
        ctaLabel: s.cta_label,
        showPaymentButton: s.show_payment_button,
        active: s.active,
      }));

      const candidates: DunningCandidate[] = (candidatesRes.data ?? []).map(
        (c: {
          user_id: string;
          email: string | null;
          name: string | null;
          last_name: string | null;
          reference_due_date: string;
          days_overdue: number;
          total_amount: number;
          items: number;
        }) => ({
          userId: c.user_id,
          email: c.email,
          name: c.name,
          lastName: c.last_name,
          referenceDueDate: c.reference_due_date,
          daysOverdue: c.days_overdue,
          totalAmount: Number(c.total_amount),
          items: c.items,
        }),
      );

      return { settings, steps, candidates, gymEmail: gymRes.data?.email ?? null };
    },
  });
}

/** Guarda (o siembra) la configuración general: interruptor y cooldown. */
export function useSaveDunningSettings(gymId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<DunningSettings>) => {
      const supabase = getBrowserSupabase();
      // upsert: la fila puede no existir todavía (primera vez que el owner
      // toca algo de esta pantalla).
      const current = qc.getQueryData<DunningData>(queryKey(gymId))?.settings ?? DEFAULT_SETTINGS;
      const next = { ...current, ...patch };
      const { error } = await supabase.from("gym_dunning_settings").upsert({
        gym_id: gymId,
        enabled: next.enabled,
        cooldown_days: next.cooldownDays,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(gymId) }),
  });
}

/**
 * Alta de un recordatorio nuevo, sembrado con la plantilla por defecto según
 * su orden. Devuelve el id Y la plantilla usada (no solo el id): así el canvas
 * puede mostrar el contenido sembrado al toque, sin esperar a que termine el
 * refetch que dispara la invalidación de abajo.
 */
export function useCreateDunningStep(gymId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (daysAfterDue: number) => {
      const supabase = getBrowserSupabase();
      const current = qc.getQueryData<DunningData>(queryKey(gymId))?.steps ?? [];
      const tpl = defaultDunningStep(current.length);

      const { data, error } = await supabase
        .from("gym_dunning_steps")
        .insert({
          gym_id: gymId,
          days_after_due: daysAfterDue,
          subject: tpl.subject,
          heading: tpl.heading,
          body_text: tpl.body_text,
          cta_label: tpl.cta_label,
          show_payment_button: tpl.show_payment_button,
        })
        .select("id")
        .single();

      if (error) throw error;
      return { id: data.id as string, tpl };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(gymId) }),
  });
}

export interface UpdateDunningStepInput {
  id: string;
  patch: Partial<{
    daysAfterDue: number;
    subject: string;
    heading: string;
    bodyText: string;
    ctaLabel: string;
    showPaymentButton: boolean;
    active: boolean;
  }>;
}

/** Edita un recordatorio existente: el día, el mail, el toggle del botón, o si está activo. */
export function useUpdateDunningStep(gymId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateDunningStepInput) => {
      const supabase = getBrowserSupabase();
      const row: Record<string, unknown> = {};
      if (patch.daysAfterDue !== undefined) row.days_after_due = patch.daysAfterDue;
      if (patch.subject !== undefined) row.subject = patch.subject;
      if (patch.heading !== undefined) row.heading = patch.heading;
      if (patch.bodyText !== undefined) row.body_text = patch.bodyText;
      if (patch.ctaLabel !== undefined) row.cta_label = patch.ctaLabel;
      if (patch.showPaymentButton !== undefined) row.show_payment_button = patch.showPaymentButton;
      if (patch.active !== undefined) row.active = patch.active;

      const { error } = await supabase.from("gym_dunning_steps").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(gymId) }),
  });
}

/**
 * Restaura el step al copy por defecto de su posición en la lista ordenada.
 * Devuelve la plantilla usada, por la misma razón que useCreateDunningStep: el
 * canvas puede pintarla al toque sin esperar el refetch.
 */
export function useRestoreDunningStep(gymId: string | null | undefined) {
  const update = useUpdateDunningStep(gymId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stepId: string) => {
      const steps = qc.getQueryData<DunningData>(queryKey(gymId))?.steps ?? [];
      const order = steps.findIndex((s) => s.id === stepId);
      const tpl = defaultDunningStep(order < 0 ? 0 : order);
      await update.mutateAsync({
        id: stepId,
        patch: {
          subject: tpl.subject,
          heading: tpl.heading,
          bodyText: tpl.body_text,
          ctaLabel: tpl.cta_label,
          showPaymentButton: tpl.show_payment_button,
        },
      });
      return tpl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(gymId) }),
  });
}

export function useDeleteDunningStep(gymId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stepId: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.from("gym_dunning_steps").delete().eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(gymId) }),
  });
}
