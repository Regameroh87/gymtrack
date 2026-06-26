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
} from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useGymStaff } from "@gymtrack/core/hooks/users/use-gym-staff";
import { useActivityMutations } from "@gymtrack/core/hooks/activities/use-activity-mutations";
import {
  useActivityPlans,
  type ActivityPlan,
} from "@gymtrack/core/hooks/activities/use-activities";
import { useActivityPlanMutations } from "@gymtrack/core/hooks/activities/use-activity-plan-mutations";
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
  coach_id: string | null;
  is_active: boolean | null;
};

const fullName = (p: { name: string | null; last_name: string | null }) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Sin nombre";

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
  const { data: staff = [] } = useGymStaff(gymId);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ACTIVITY_COLOR);
  const [coachId, setCoachId] = useState<string | null>(
    initial?.coach_id ?? null
  );
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
      coach_id: coachId,
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

          <Field label="COACH (OPCIONAL)">
            {staff.length === 0 ? (
              <span className="font-manrope text-[12px] text-ui-text-muted">
                No hay coaches en este gimnasio todavía.
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {staff.map((s) => {
                  const selected = coachId === s.id;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setCoachId(selected ? null : s.id)}
                      className={`rounded-full border px-3 py-1.5 font-manrope text-[12px] font-semibold capitalize transition ${
                        selected
                          ? "border-brandPrimary-600 bg-brandPrimary-600 text-white"
                          : "border-ui-input-border bg-white text-ui-text-muted hover:bg-ui-background-light"
                      }`}
                    >
                      {fullName(s)}
                    </button>
                  );
                })}
              </div>
            )}
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
