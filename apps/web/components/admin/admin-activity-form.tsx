"use client";

// Alta/edición de ACTIVIDAD del gym (página completa). Port a Next de apps/mobile
// admin/activities/add + edit/[id] (FormActivity + ActivityPlansManager). Datos y
// mutaciones por los hooks web-safe de core (supabase directo). En alta solo se
// crea la actividad y se redirige a edición para cargar los pases.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
} from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useActivityMutations } from "@gymtrack/core/hooks/activities/use-activity-mutations";
import {
  useActivityPlans,
  type ActivityPlan,
  type ActivityCoach,
} from "@gymtrack/core/hooks/activities/use-activities";
import { useActivityPlanMutations } from "@gymtrack/core/hooks/activities/use-activity-plan-mutations";
import { useActivityCoaches } from "@gymtrack/core/hooks/activities/use-activity-coaches";
import { useActivityCoachMutations } from "@gymtrack/core/hooks/activities/use-activity-coach-mutations";
import {
  useGymStaff,
  type StaffMember,
} from "@gymtrack/core/hooks/users/use-gym-staff";
import {
  ACTIVITY_COLORS,
  DEFAULT_ACTIVITY_COLOR,
  FREQUENCY_OPTIONS,
} from "@/lib/activity-options";
import {
  Field,
  Input,
  Textarea,
  Toggle,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
} from "@/components/platform/catalog/catalog-ui";

export type ActivityInitial = {
  id: string;
  name: string | null;
  description: string | null;
  color: string | null;
  is_active: boolean | null;
};

// Pase cargado en memoria durante el alta (antes de existir el activity_id).
type LocalPass = {
  tempId: string;
  label: string;
  frequency_per_week: number | null;
  price: string;
  is_active: boolean;
};

const normalizePass = (p: {
  label: string;
  frequency_per_week: number | null;
  price: string;
  is_active: boolean;
}) => ({
  label: p.label.trim(),
  frequency_per_week: p.frequency_per_week == null ? null : Number(p.frequency_per_week),
  price: p.price === "" || p.price == null ? null : Number(p.price),
  is_active: p.is_active ?? true,
});

export function AdminActivityForm({
  gymId,
  initial,
}: {
  gymId: string | null;
  initial: ActivityInitial | null;
}) {
  const router = useRouter();
  const editingId = initial?.id ?? null;
  const { create, update, remove } = useActivityMutations(gymId);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ACTIVITY_COLOR);
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  // En alta los pases se cargan en memoria y se persisten al crear la actividad.
  const [localPasses, setLocalPasses] = useState<LocalPass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isSavingPasses, setIsSavingPasses] = useState(false);
  const pending = create.isPending || update.isPending || isSavingPasses;

  const handleSubmit = async () => {
    setError(null);
    if (name.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (!editingId && !gymId) {
      setError("No hay un gimnasio activo.");
      return;
    }
    const values = {
      name,
      description,
      color,
      is_active: isActive,
    };
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...values });
        router.push("/admin/activities");
        router.refresh();
      } else {
        const created = await create.mutateAsync(values);
        // Persistir los pases cargados en el mismo flujo de alta.
        if (localPasses.length) {
          setIsSavingPasses(true);
          const supabase = getBrowserSupabase();
          const rows = localPasses.map((p, i) => ({
            activity_id: created.id,
            sort_order: i,
            ...normalizePass(p),
          }));
          const { error: passErr } = await supabase
            .from("activity_plans")
            .insert(rows);
          if (passErr) throw passErr;
        }
        router.push("/admin/activities");
        router.refresh();
      }
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar la actividad.");
      setIsSavingPasses(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(editingId);
      router.push("/admin/activities");
      router.refresh();
    } catch (err) {
      setDeleteError(
        (err as Error)?.message || "No se pudo eliminar la actividad."
      );
    }
  };

  return (
    <div className="p-4 pb-14 md:p-9">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/activities")}
          className="mb-1.5 flex items-center gap-1 transition hover:opacity-70"
        >
          <ArrowLeft size={11} className="text-ui-text-muted" />
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
            Actividades
          </span>
        </button>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          {editingId ? "Editar actividad" : "Nueva actividad"}
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          Disciplina del gimnasio y sus pases (frecuencia y precio)
        </p>
      </div>

      <div className="mx-auto w-full max-w-[560px] rounded-[20px] border border-ui-input-border bg-white p-8">
        <ErrorBanner message={error} />

        <div className="flex flex-col gap-4">
          <Field label="NOMBRE">
            <Input
              placeholder="Ej: Musculación, CrossFit, Yoga"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="DESCRIPCIÓN (OPCIONAL)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción..."
              rows={3}
            />
          </Field>

          <Field label="COLOR">
            <div className="flex flex-wrap gap-3">
              {ACTIVITY_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition"
                    style={{
                      backgroundColor: c,
                      outline: selected ? "3px solid #fff" : "none",
                      boxShadow: selected ? `0 0 0 2px ${c}` : "none",
                      transform: selected ? "scale(1.1)" : "none",
                    }}
                  >
                    {selected && <Check size={16} color="#fff" />}
                  </button>
                );
              })}
            </div>
          </Field>

          <Toggle
            label="Actividad activa"
            hint="Las inactivas no se ofrecen a los socios"
            value={isActive}
            onChange={setIsActive}
          />
        </div>

        {/* Pases en el alta: se cargan en memoria y se guardan al crear. */}
        {!editingId && (
          <>
            <div className="my-6 h-px bg-ui-input-border" />
            <LocalPassesEditor passes={localPasses} onChange={setLocalPasses} />
          </>
        )}

        <FormActions
          onCancel={() => router.push("/admin/activities")}
          onSubmit={handleSubmit}
          isPending={pending}
          submitLabel={editingId ? "Guardar cambios" : "Crear actividad"}
        />

        {/* Pases — solo en edición (necesita el id de la actividad). */}
        {editingId && (
          <>
            <div className="my-6 h-px bg-ui-input-border" />
            <ActivityPlansManager activityId={editingId} gymId={gymId} />

            <div className="my-6 h-px bg-ui-input-border" />
            <ActivityCoachesManager activityId={editingId} gymId={gymId} />

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-[11px] border border-red-200 bg-white py-2.5 font-manrope text-[13px] font-bold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={14} color="#dc2626" />
              Eliminar actividad
            </button>
          </>
        )}
      </div>

      <DeleteConfirmModal
        visible={confirmDelete}
        title="Eliminar actividad"
        message={`Vas a eliminar “${name}”. Se quitan también sus pases y las inscripciones de socios a esta actividad. Esta acción no se puede deshacer.`}
        error={deleteError}
        isPending={remove.isPending}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Gestor de pases (activity_plans) ──
type Draft = {
  id: string | null;
  label: string;
  frequency_per_week: number | null;
  price: string;
  is_active: boolean;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  label: "",
  frequency_per_week: null,
  price: "",
  is_active: true,
};

const formatPrice = (price: number | string | null) =>
  price == null ? "Sin precio" : `$${Number(price).toLocaleString("es-AR")}`;

const freqLabel = (f: number | null) =>
  f == null ? "Libre" : `${f} ${f === 1 ? "vez" : "veces"}/semana`;

// ── Editor de pases en memoria (alta) ──
type LocalDraft = {
  index: number | null; // null = nuevo; número = editando ese pase
  label: string;
  frequency_per_week: number | null;
  price: string;
  is_active: boolean;
};

const EMPTY_LOCAL: LocalDraft = {
  index: null,
  label: "",
  frequency_per_week: null,
  price: "",
  is_active: true,
};

function LocalPassesEditor({
  passes,
  onChange,
}: {
  passes: LocalPass[];
  onChange: (next: LocalPass[]) => void;
}) {
  const [draft, setDraft] = useState<LocalDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setError(null);
    setDraft({ ...EMPTY_LOCAL });
  };
  const openEdit = (i: number) => {
    setError(null);
    const p = passes[i];
    setDraft({
      index: i,
      label: p.label,
      frequency_per_week: p.frequency_per_week,
      price: p.price,
      is_active: p.is_active,
    });
  };
  const close = () => setDraft(null);

  const pickFrequency = (opt: { value: number | null; label: string }) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            frequency_per_week: opt.value,
            label: d.label.trim() ? d.label : opt.label,
          }
        : d
    );

  const save = () => {
    if (!draft) return;
    if (draft.label.trim().length < 2) {
      setError("Falta el nombre del pase.");
      return;
    }
    const entry: LocalPass = {
      tempId: draft.index != null ? passes[draft.index].tempId : crypto.randomUUID(),
      label: draft.label,
      frequency_per_week: draft.frequency_per_week,
      price: draft.price,
      is_active: draft.is_active,
    };
    if (draft.index != null) {
      onChange(passes.map((p, i) => (i === draft.index ? entry : p)));
    } else {
      onChange([...passes, entry]);
    }
    close();
  };

  const remove = (i: number) => onChange(passes.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
          Pases
        </span>
        {!draft && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-brandPrimary-50 px-3 py-1.5 transition hover:bg-brandPrimary-100"
          >
            <Plus size={13} className="text-brandPrimary-600" />
            <span className="font-manrope text-[12px] font-bold text-brandPrimary-600">
              Agregar pase
            </span>
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {draft && (
        <div className="flex flex-col gap-3 rounded-2xl border border-ui-input-border bg-ui-background-light p-4">
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[14px] font-bold text-ui-text-main">
              {draft.index != null ? "Editar pase" : "Nuevo pase"}
            </span>
            <button type="button" onClick={close}>
              <X size={16} className="text-ui-text-muted" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
              Frecuencia
            </span>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const selected = draft.frequency_per_week === opt.value;
                return (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => pickFrequency(opt)}
                    className={`rounded-full border px-3 py-1.5 font-manrope text-[12px] font-semibold transition ${
                      selected
                        ? "border-brandPrimary-600 bg-brandPrimary-600 text-white"
                        : "border-ui-input-border bg-white text-ui-text-muted hover:bg-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="NOMBRE DEL PASE">
            <Input
              placeholder="Ej: 3 veces/semana"
              value={draft.label}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, label: e.target.value } : d))
              }
            />
          </Field>

          <Field label="PRECIO MENSUAL">
            <Input
              placeholder="0.00"
              inputMode="decimal"
              value={draft.price}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, price: e.target.value } : d))
              }
            />
          </Field>

          <Toggle
            label="Pase activo"
            value={draft.is_active}
            onChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))}
          />

          <button
            type="button"
            onClick={save}
            className="mt-1 flex items-center justify-center gap-2 rounded-[11px] bg-brandPrimary-600 py-2.5 font-manrope text-[13px] font-bold text-white transition hover:bg-brandPrimary-700"
          >
            {draft.index != null ? "Guardar pase" : "Agregar pase"}
          </button>
        </div>
      )}

      {passes.length === 0
        ? !draft && (
            <div className="rounded-2xl border border-dashed border-ui-input-border bg-ui-background-light/50 px-6 py-6 text-center">
              <span className="font-manrope text-[12px] text-ui-text-muted">
                Agregá los pases (frecuencia y precio) que vas a vender de esta
                actividad. Podés sumar más después.
              </span>
            </div>
          )
        : (
            <div className="flex flex-col gap-2">
              {passes.map((plan, i) => (
                <div
                  key={plan.tempId}
                  className="flex items-center gap-3 rounded-2xl border border-ui-input-border bg-white p-3.5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-jakarta text-[14px] font-bold text-ui-text-main">
                        {plan.label}
                      </span>
                      {!plan.is_active && (
                        <span className="rounded bg-ui-background-light px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wider text-ui-text-muted">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 font-manrope text-[12px] text-ui-text-muted">
                      {freqLabel(plan.frequency_per_week)} ·{" "}
                      {formatPrice(plan.price === "" ? null : plan.price)}/mes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(i)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brandPrimary-50 transition hover:bg-brandPrimary-100"
                  >
                    <Pencil size={14} className="text-brandPrimary-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100"
                  >
                    <Trash2 size={14} color="#dc2626" />
                  </button>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

function ActivityPlansManager({
  activityId,
  gymId,
}: {
  activityId: string;
  gymId: string | null;
}) {
  const { data: plans = [], isLoading } = useActivityPlans(activityId);
  const { create, update, remove } = useActivityPlanMutations(activityId, gymId);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setError(null);
    setDraft({ ...EMPTY_DRAFT });
  };
  const openEdit = (plan: ActivityPlan) => {
    setError(null);
    setDraft({
      id: plan.id,
      label: plan.label ?? "",
      frequency_per_week: plan.frequency_per_week ?? null,
      price: plan.price == null ? "" : String(plan.price),
      is_active: plan.is_active ?? true,
    });
  };
  const close = () => setDraft(null);

  const pickFrequency = (opt: { value: number | null; label: string }) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            frequency_per_week: opt.value,
            label: d.label.trim() ? d.label : opt.label,
          }
        : d
    );

  const save = async () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (label.length < 2) {
      setError("Falta el nombre del pase.");
      return;
    }
    setError(null);
    try {
      if (draft.id) {
        await update.mutateAsync({
          id: draft.id,
          label,
          frequency_per_week: draft.frequency_per_week,
          price: draft.price,
          is_active: draft.is_active,
        });
      } else {
        await create.mutateAsync({
          label,
          frequency_per_week: draft.frequency_per_week,
          price: draft.price,
          is_active: draft.is_active,
          sort_order: plans.length,
        });
      }
      close();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el pase.");
    }
  };

  const del = async (plan: ActivityPlan) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`¿Eliminar el pase "${plan.label}"?`)
    )
      return;
    try {
      await remove.mutateAsync(plan.id);
      if (draft?.id === plan.id) close();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo eliminar el pase.");
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
          Pases
        </span>
        {!draft && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-brandPrimary-50 px-3 py-1.5 transition hover:bg-brandPrimary-100"
          >
            <Plus size={13} className="text-brandPrimary-600" />
            <span className="font-manrope text-[12px] font-bold text-brandPrimary-600">
              Agregar pase
            </span>
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {draft && (
        <div className="flex flex-col gap-3 rounded-2xl border border-ui-input-border bg-ui-background-light p-4">
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[14px] font-bold text-ui-text-main">
              {draft.id ? "Editar pase" : "Nuevo pase"}
            </span>
            <button type="button" onClick={close}>
              <X size={16} className="text-ui-text-muted" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
              Frecuencia
            </span>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const selected = draft.frequency_per_week === opt.value;
                return (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => pickFrequency(opt)}
                    className={`rounded-full border px-3 py-1.5 font-manrope text-[12px] font-semibold transition ${
                      selected
                        ? "border-brandPrimary-600 bg-brandPrimary-600 text-white"
                        : "border-ui-input-border bg-white text-ui-text-muted hover:bg-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="NOMBRE DEL PASE">
            <Input
              placeholder="Ej: 3 veces/semana"
              value={draft.label}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, label: e.target.value } : d))
              }
            />
          </Field>

          <Field label="PRECIO MENSUAL">
            <Input
              placeholder="0.00"
              inputMode="decimal"
              value={draft.price}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, price: e.target.value } : d))
              }
            />
          </Field>

          <Toggle
            label="Pase activo"
            value={draft.is_active}
            onChange={(v) =>
              setDraft((d) => (d ? { ...d, is_active: v } : d))
            }
          />

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 font-manrope text-[13px] font-bold text-white ${
                saving
                  ? "bg-brandPrimary-400"
                  : "bg-brandPrimary-600 hover:bg-brandPrimary-700"
              }`}
            >
              {saving
                ? "Guardando..."
                : draft.id
                  ? "Guardar pase"
                  : "Agregar pase"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-brandPrimary-600" />
        </div>
      ) : plans.length === 0 ? (
        !draft && (
          <div className="rounded-2xl border border-dashed border-ui-input-border bg-ui-background-light/50 px-6 py-6 text-center">
            <span className="font-manrope text-[12px] text-ui-text-muted">
              Aún no hay pases. Agregá el primero (ej. 2 veces/semana) para poder
              vender esta actividad.
            </span>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-3 rounded-2xl border border-ui-input-border bg-white p-3.5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-jakarta text-[14px] font-bold text-ui-text-main">
                    {plan.label}
                  </span>
                  {!plan.is_active && (
                    <span className="rounded bg-ui-background-light px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wider text-ui-text-muted">
                      Inactivo
                    </span>
                  )}
                </div>
                <span className="mt-0.5 font-manrope text-[12px] text-ui-text-muted">
                  {freqLabel(plan.frequency_per_week)} · {formatPrice(plan.price)}
                  /mes
                </span>
              </div>
              <button
                type="button"
                onClick={() => openEdit(plan)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brandPrimary-50 transition hover:bg-brandPrimary-100"
              >
                <Pencil size={14} className="text-brandPrimary-600" />
              </button>
              <button
                type="button"
                onClick={() => del(plan)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100"
              >
                <Trash2 size={14} color="#dc2626" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Gestor de coaches (activity_coaches) ──
type CoachDraft = {
  id: string | null;
  coach_id: string | null;
  monthly_fee: string;
  revenue_share_pct: string;
  rate_per_class: string;
  is_active: boolean;
};

const EMPTY_COACH_DRAFT: CoachDraft = {
  id: null,
  coach_id: null,
  monthly_fee: "",
  revenue_share_pct: "",
  rate_per_class: "",
  is_active: true,
};

const staffName = (p: { name: string | null; last_name: string | null } | null) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Sin nombre";

const coachMoney = (v: number | string) => `$${Number(v).toLocaleString("es-AR")}`;

const schemeSummary = (row: ActivityCoach) => {
  const parts: string[] = [];
  if (row.monthly_fee != null) parts.push(`${coachMoney(row.monthly_fee)} fijo`);
  if (row.revenue_share_pct != null)
    parts.push(`${Number(row.revenue_share_pct)}% ingresos`);
  if (row.rate_per_class != null)
    parts.push(`${coachMoney(row.rate_per_class)}/clase`);
  return parts.length ? parts.join(" · ") : "Sin esquema de pago";
};

function ActivityCoachesManager({
  activityId,
  gymId,
}: {
  activityId: string;
  gymId: string | null;
}) {
  const { data: coaches = [], isLoading } = useActivityCoaches(activityId);
  const { data: staff = [] } = useGymStaff(gymId);
  const { create, update, remove } = useActivityCoachMutations(activityId, gymId);

  const [draft, setDraft] = useState<CoachDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set(coaches.map((c) => c.coach_id));

  const openNew = () => {
    setError(null);
    setDraft({ ...EMPTY_COACH_DRAFT });
  };
  const openEdit = (row: ActivityCoach) => {
    setError(null);
    setDraft({
      id: row.id,
      coach_id: row.coach_id,
      monthly_fee: row.monthly_fee == null ? "" : String(row.monthly_fee),
      revenue_share_pct:
        row.revenue_share_pct == null ? "" : String(row.revenue_share_pct),
      rate_per_class: row.rate_per_class == null ? "" : String(row.rate_per_class),
      is_active: row.is_active ?? true,
    });
  };
  const close = () => setDraft(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.coach_id) {
      setError("Elegí un coach.");
      return;
    }
    const pct =
      draft.revenue_share_pct === "" ? null : Number(draft.revenue_share_pct);
    if (pct != null && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      setError("El % de ingresos debe estar entre 0 y 100.");
      return;
    }
    setError(null);
    try {
      const value = {
        coach_id: draft.coach_id,
        monthly_fee: draft.monthly_fee,
        revenue_share_pct: draft.revenue_share_pct,
        rate_per_class: draft.rate_per_class,
        is_active: draft.is_active,
      };
      if (draft.id) {
        await update.mutateAsync({ id: draft.id, ...value });
      } else {
        await create.mutateAsync(value);
      }
      close();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el coach.");
    }
  };

  const del = async (row: ActivityCoach) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`¿Quitar a ${staffName(row.coach)} de esta actividad?`)
    )
      return;
    try {
      await remove.mutateAsync(row.id);
      if (draft?.id === row.id) close();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo quitar el coach.");
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
          Coaches
        </span>
        {!draft && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-brandPrimary-50 px-3 py-1.5 transition hover:bg-brandPrimary-100"
          >
            <Plus size={13} className="text-brandPrimary-600" />
            <span className="font-manrope text-[12px] font-bold text-brandPrimary-600">
              Asignar coach
            </span>
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {draft && (
        <div className="flex flex-col gap-3 rounded-2xl border border-ui-input-border bg-ui-background-light p-4">
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-[14px] font-bold text-ui-text-main">
              {draft.id ? "Editar coach" : "Asignar coach"}
            </span>
            <button type="button" onClick={close}>
              <X size={16} className="text-ui-text-muted" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
              Coach
            </span>
            {staff.length === 0 ? (
              <span className="font-manrope text-[12px] text-ui-text-muted">
                No hay coaches en este gimnasio todavía.
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {staff
                  .filter((s: StaffMember) =>
                    draft.id ? s.id === draft.coach_id : !assignedIds.has(s.id)
                  )
                  .map((s: StaffMember) => {
                    const selected = draft.coach_id === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        disabled={!!draft.id}
                        onClick={() =>
                          setDraft((d) =>
                            d
                              ? { ...d, coach_id: selected ? null : s.id }
                              : d
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 font-manrope text-[12px] font-semibold transition disabled:cursor-default ${
                          selected
                            ? "border-brandPrimary-600 bg-brandPrimary-600 text-white"
                            : "border-ui-input-border bg-white text-ui-text-muted hover:bg-white"
                        }`}
                      >
                        {staffName(s)}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <Field label="FIJO MENSUAL">
            <Input
              placeholder="0.00 (opcional)"
              inputMode="decimal"
              value={draft.monthly_fee}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, monthly_fee: e.target.value } : d))
              }
            />
          </Field>

          <Field label="% DE LOS INGRESOS DE LA ACTIVIDAD">
            <Input
              placeholder="Ej: 10 (opcional)"
              inputMode="decimal"
              value={draft.revenue_share_pct}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, revenue_share_pct: e.target.value } : d
                )
              }
            />
          </Field>

          <Field label="TARIFA POR CLASE DICTADA">
            <Input
              placeholder="0.00 (opcional)"
              inputMode="decimal"
              value={draft.rate_per_class}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, rate_per_class: e.target.value } : d))
              }
            />
          </Field>

          <Toggle
            label="Asignación activa"
            value={draft.is_active}
            onChange={(v) => setDraft((d) => (d ? { ...d, is_active: v } : d))}
          />

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 font-manrope text-[13px] font-bold text-white ${
                saving
                  ? "bg-brandPrimary-400"
                  : "bg-brandPrimary-600 hover:bg-brandPrimary-700"
              }`}
            >
              {saving ? "Guardando..." : draft.id ? "Guardar" : "Asignar"}
            </button>
            {draft.id && (
              <button
                type="button"
                onClick={() => {
                  const row = coaches.find((c) => c.id === draft.id);
                  if (row) del(row);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-red-50 transition hover:bg-red-100"
              >
                <Trash2 size={14} color="#dc2626" />
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-brandPrimary-600" />
        </div>
      ) : coaches.length === 0 ? (
        !draft && (
          <div className="rounded-2xl border border-dashed border-ui-input-border bg-ui-background-light/50 px-6 py-6 text-center">
            <Users size={20} className="mx-auto mb-2 text-ui-text-muted" />
            <span className="font-manrope text-[12px] text-ui-text-muted">
              Sin coaches asignados. Asigná quién dicta esta actividad y cómo
              cobra para poder calcular sus pagos.
            </span>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {coaches.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-2xl border border-ui-input-border bg-white p-3.5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-jakarta text-[14px] font-bold text-ui-text-main">
                    {staffName(row.coach)}
                  </span>
                  {!row.is_active && (
                    <span className="rounded bg-ui-background-light px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wider text-ui-text-muted">
                      Inactivo
                    </span>
                  )}
                </div>
                <span className="mt-0.5 font-manrope text-[12px] text-ui-text-muted">
                  {schemeSummary(row)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brandPrimary-50 transition hover:bg-brandPrimary-100"
              >
                <Pencil size={14} className="text-brandPrimary-600" />
              </button>
              <button
                type="button"
                onClick={() => del(row)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100"
              >
                <Trash2 size={14} color="#dc2626" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
