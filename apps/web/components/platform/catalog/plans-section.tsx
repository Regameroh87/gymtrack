"use client";

// Sección PLANES del catálogo (super_admin). Port a Next de apps/mobile
// platform/catalog/_plans-section-web.jsx: lista activos/archivados + builder
// (metadata → semanas → días → sesiones → prescripción por serie) + drawer de
// detalle. Guarda por el RPC save_catalog_plan. Ver [[project_default_catalog]].

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import {
  useCatalogPlansAdmin,
  useSaveCatalogPlan,
  useArchiveCatalogPlan,
  useArchivedCatalogPlans,
  useRestoreCatalogPlan,
  useDeleteCatalogPlan,
  useCatalogPlanDetail,
  fetchCatalogPlanDetail,
  type CatalogPlan,
  type ArchivedCatalogPlan,
  type PlanMeta,
} from "@/lib/hooks/use-catalog-plans";
import {
  useCatalogSessionsAdmin,
  fetchCatalogSessionExercises,
} from "@/lib/hooks/use-catalog-sessions";
import {
  buildEmptyWeeks,
  resizeWeeksByDuration,
  resizeWeeksByWeeklyDays,
  makePrescription,
  makeEmptySet,
  padLoadedWeeks,
  type BuilderWeek,
  type BuilderDay,
  type BuilderExercise,
} from "@/lib/catalog-plan-helpers";
import { uploadImageWeb } from "@/lib/gyms";
import { mediaUrl } from "@/lib/media";
import {
  PLAN_OBJECTIVES,
  PLAN_LEVELS,
  labelOf,
  type Option,
} from "@/lib/catalog-options";
import { PLAN_TARGET_GENDERS } from "@/lib/gender-options";
import {
  Field,
  Input,
  Textarea,
  WebSelect,
  CoverPicker,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
  ModalShell,
} from "./catalog-ui";

// Mínimo 2 días por semana.
const WEEKLY_DAYS_OPTS: Option[] = Array.from({ length: 6 }, (_, i) => ({
  value: String(i + 2),
  label: `${i + 2} días`,
}));
// duration_weeks === 0 ⇒ plan flexible: una semana tipo repetible.
const DURATION_OPTS: Option[] = [
  { value: "0", label: "Flexible · semana tipo" },
  ...Array.from({ length: 16 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} semana${i === 0 ? "" : "s"}`,
  })),
];

const EMPTY_META: PlanMeta = {
  name: "",
  description: "",
  objective: "",
  level: "",
  target_gender: "ambos",
  weekly_days: 3,
  duration_weeks: 4,
  cover_image_uri: null,
};

export function CatalogPlansSection() {
  const { data: plans = [], isLoading } = useCatalogPlansAdmin();
  const { data: archived = [], isLoading: loadingArchived } =
    useArchivedCatalogPlans();
  const archivePlan = useArchiveCatalogPlan();
  const restorePlan = useRestoreCatalogPlan();
  const deletePlan = useDeleteCatalogPlan();

  const [view, setView] = useState<"active" | "archived">("active");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogPlan | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<ArchivedCatalogPlan | null>(
    null
  );
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CatalogPlan | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setBuilderOpen(true);
  };
  const openEdit = (p: CatalogPlan) => {
    setEditingId(p.id);
    setBuilderOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await archivePlan.mutateAsync(confirmDelete.id);
    } catch {
      // La invalidación reflejará el estado real.
    }
    setConfirmDelete(null);
  };

  const handlePurge = async () => {
    if (!confirmPurge) return;
    setPurgeError(null);
    try {
      await deletePlan.mutateAsync(confirmPurge.id);
      setConfirmPurge(null);
    } catch (err) {
      setPurgeError((err as Error)?.message || "No se pudo eliminar el plan.");
      setConfirmPurge(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <p className="flex-1 font-manrope text-xs text-ui-text-muted">
          Planes completos (semanas → días → sesiones → prescripción) armados con
          sesiones del catálogo. Los gimnasios con el catálogo activado los ven
          read-only.
        </p>
        {view === "active" && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700"
          >
            <Plus size={15} color="#fff" />
            <span className="font-manrope text-[13px] font-bold text-white">
              Nuevo plan
            </span>
          </button>
        )}
      </div>

      {/* Toggle Activos / Archivados */}
      <div className="mx-auto mb-5 flex w-full max-w-[880px] gap-1 rounded-[12px] border border-ui-input-border bg-ui-background-light p-1">
        <SegBtn
          label="Activos"
          count={plans.length}
          active={view === "active"}
          onClick={() => setView("active")}
        />
        <SegBtn
          label="Archivados"
          count={archived.length}
          active={view === "archived"}
          onClick={() => setView("archived")}
        />
      </div>

      {purgeError && view === "archived" ? (
        <div className="mx-auto mb-3 w-full max-w-[880px] rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-manrope text-[12px] font-bold text-red-700">
            {purgeError}
          </p>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[880px] overflow-hidden rounded-[20px] border border-ui-input-border bg-white">
        {view === "active" ? (
          isLoading ? (
            <Spinner />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No hay planes de catálogo"
              hint="Creá el primero con “Nuevo plan”."
            />
          ) : (
            plans.map((p, i) => (
              <PlanRow
                key={p.id}
                plan={p}
                first={i === 0}
                onView={() => setDetail(p)}
                onEdit={() => openEdit(p)}
                onDelete={() => setConfirmDelete(p)}
              />
            ))
          )
        ) : loadingArchived ? (
          <Spinner />
        ) : archived.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="No hay planes archivados"
            hint="Cuando quites un plan del catálogo aparecerá acá. Los que no sigue nadie por +30 días se borran solos."
          />
        ) : (
          archived.map((p, i) => (
            <ArchivedPlanRow
              key={p.id}
              plan={p}
              first={i === 0}
              isRestoring={restorePlan.isPending}
              onRestore={() => restorePlan.mutate(p.id)}
              onPurge={() => {
                setPurgeError(null);
                setConfirmPurge(p);
              }}
            />
          ))
        )}
      </div>

      {builderOpen && (
        <PlanBuilderModal
          planId={editingId}
          onClose={() => setBuilderOpen(false)}
        />
      )}

      {detail && (
        <PlanDetailDrawer
          plan={detail}
          onClose={() => setDetail(null)}
          onEdit={(p) => {
            setDetail(null);
            openEdit(p);
          }}
          onDelete={(p) => {
            setDetail(null);
            setConfirmDelete(p);
          }}
        />
      )}

      <DeleteConfirmModal
        visible={!!confirmDelete}
        title="Quitar plan del catálogo"
        message={`Vas a quitar “${confirmDelete?.name}” del catálogo. Los gimnasios dejarán de verlo, pero los members que ya lo están siguiendo podrán terminarlo.`}
        isPending={archivePlan.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />

      <DeleteConfirmModal
        visible={!!confirmPurge}
        title="Eliminar definitivamente"
        message={`Vas a borrar “${confirmPurge?.name}” y todo su contenido de forma permanente. Esta acción no se puede deshacer.`}
        isPending={deletePlan.isPending}
        onCancel={() => setConfirmPurge(null)}
        onConfirm={handlePurge}
      />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} className="animate-spin text-brandPrimary-600" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Calendar;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandPrimary-50">
        <Icon size={20} className="text-brandPrimary-600" />
      </div>
      <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
        {title}
      </p>
      <p className="text-center font-manrope text-xs text-ui-text-muted">
        {hint}
      </p>
    </div>
  );
}

function SegBtn({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-[9px] py-2 ${
        active ? "bg-white shadow-sm" : "hover:bg-white/50"
      }`}
    >
      <span
        className={`font-manrope text-[13px] font-bold ${
          active ? "text-brandPrimary-600" : "text-ui-text-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`rounded-full px-1.5 ${active ? "bg-brandPrimary-50" : ""}`}
      >
        <span
          className={`font-manrope text-[11px] font-bold ${
            active ? "text-brandPrimary-600" : "text-ui-text-muted"
          }`}
        >
          {count}
        </span>
      </span>
    </button>
  );
}

function PlanRow({
  plan,
  first,
  onView,
  onEdit,
  onDelete,
}: {
  plan: CatalogPlan;
  first: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumb = mediaUrl(plan.cover_image_uri);
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 ${
        first ? "" : "border-t border-ui-input-light"
      }`}
    >
      <button
        type="button"
        onClick={onView}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-11 w-11 rounded-[10px] object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-brandPrimary-50">
            <Calendar size={16} className="text-brandPrimary-600" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-manrope text-[14px] font-bold text-ui-text-main">
            {plan.name}
          </p>
          <p className="mt-0.5 font-manrope text-[11px] capitalize text-ui-text-muted">
            {plan.duration_weeks ? `${plan.duration_weeks} sem` : "Flexible"} ·{" "}
            {plan.weekly_days} días/sem
            {plan.objective ? ` · ${plan.objective}` : ""}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ui-background-light transition hover:bg-ui-input-light"
      >
        <Pencil size={14} className="text-ui-text-main" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100"
      >
        <Trash2 size={14} color="#dc2626" />
      </button>
    </div>
  );
}

function ArchivedPlanRow({
  plan,
  first,
  isRestoring,
  onRestore,
  onPurge,
}: {
  plan: ArchivedCatalogPlan;
  first: boolean;
  isRestoring: boolean;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const thumb = mediaUrl(plan.cover_image_uri);
  const followers = Number(plan.active_followers ?? 0);
  const blocked = followers > 0;

  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 ${
        first ? "" : "border-t border-ui-input-light"
      }`}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-11 w-11 rounded-[10px] object-cover opacity-65" />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-ui-background-light">
          <Calendar size={16} className="text-ui-text-muted" />
        </div>
      )}

      <div className="flex-1">
        <p className="font-manrope text-[14px] font-bold text-ui-text-main">
          {plan.name}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Users size={12} color={blocked ? "#d97706" : "#9ca3af"} />
            <span
              className="font-manrope text-[11px] font-bold"
              style={{ color: blocked ? "#d97706" : "#9ca3af" }}
            >
              {followers} {followers === 1 ? "seguidor" : "seguidores"}
            </span>
          </div>
          {blocked && (
            <span className="font-manrope text-[11px] text-ui-text-muted">
              · no se puede borrar todavía
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRestore}
        disabled={isRestoring}
        className="flex h-9 items-center gap-1.5 rounded-[10px] bg-ui-background-light px-3 transition hover:bg-ui-input-light disabled:opacity-50"
      >
        <ArrowLeft size={13} className="text-ui-text-main" />
        <span className="font-manrope text-[12px] font-bold text-ui-text-main">
          Restaurar
        </span>
      </button>

      <button
        type="button"
        onClick={blocked ? undefined : onPurge}
        disabled={blocked}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Trash2 size={14} color="#dc2626" />
      </button>
    </div>
  );
}

// ── Builder ──
function PlanBuilderModal({
  planId,
  onClose,
}: {
  planId: string | null;
  onClose: () => void;
}) {
  const savePlan = useSaveCatalogPlan();
  const { data: sessions = [] } = useCatalogSessionsAdmin();

  const [meta, setMeta] = useState<PlanMeta>(EMPTY_META);
  const [weeks, setWeeks] = useState<BuilderWeek[]>(() => buildEmptyWeeks(4, 3));
  const [activeWeek, setActiveWeek] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!planId);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sessionOpts: Option[] = useMemo(
    () => sessions.map((s) => ({ value: s.id, label: s.name })),
    [sessions]
  );

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await fetchCatalogPlanDetail(planId);
        if (cancelled || !detail) return;
        const { weeks: loadedWeeks, ...m } = detail;
        setMeta({
          name: m.name,
          description: m.description,
          objective: m.objective,
          level: m.level,
          target_gender: m.target_gender,
          weekly_days: m.weekly_days,
          duration_weeks: m.duration_weeks,
          cover_image_uri: m.cover_image_uri || null,
        });
        setWeeks(padLoadedWeeks(loadedWeeks, m.weekly_days));
      } catch (err) {
        if (!cancelled)
          setError((err as Error)?.message || "No se pudo cargar el plan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const setMetaField =
    <K extends keyof PlanMeta>(key: K) =>
    (v: PlanMeta[K]) =>
      setMeta((p) => ({ ...p, [key]: v }));

  const handleDuration = (val: string) => {
    const parsed = parseInt(val, 10);
    const duration = Number.isNaN(parsed) ? 1 : parsed;
    const effectiveWeeks = duration === 0 ? 1 : duration;
    setMeta((p) => ({ ...p, duration_weeks: duration }));
    setWeeks((w) => resizeWeeksByDuration(w, effectiveWeeks, meta.weekly_days));
    setActiveWeek((a) => Math.min(a, effectiveWeeks - 1));
  };
  const handleWeeklyDays = (val: string) => {
    const n = parseInt(val, 10) || 1;
    setMeta((p) => ({ ...p, weekly_days: n }));
    setWeeks((w) => resizeWeeksByWeeklyDays(w, n));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ── Mutaciones del árbol ──
  const patchDay = (wIdx: number, dIdx: number, patch: Partial<BuilderDay>) =>
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) => (j !== dIdx ? d : { ...d, ...patch })),
            }
      )
    );

  const assignSession = async (
    wIdx: number,
    dIdx: number,
    sessionId: string
  ) => {
    if (!sessionId) {
      patchDay(wIdx, dIdx, {
        session_id: null,
        session_name: null,
        exercises: [],
      });
      return;
    }
    const session = sessions.find((s) => s.id === sessionId);
    try {
      const ses = await fetchCatalogSessionExercises(sessionId);
      patchDay(wIdx, dIdx, {
        session_id: sessionId,
        session_name: session?.name ?? null,
        exercises: ses.map((se, idx) =>
          makePrescription(
            {
              id: se.id ?? se.exercise_id,
              exercise_id: se.exercise_id,
              name: se.name,
              muscle_group: se.muscle_group,
              image_uri: se.image_uri,
            },
            idx
          )
        ),
      });
    } catch (err) {
      setError(
        (err as Error)?.message || "No se pudieron cargar los ejercicios."
      );
    }
  };

  const patchExercise = (
    wIdx: number,
    dIdx: number,
    exIdx: number,
    patch: Partial<BuilderExercise>
  ) =>
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== dIdx
                  ? d
                  : {
                      ...d,
                      exercises: d.exercises.map((ex, k) =>
                        k !== exIdx ? ex : { ...ex, ...patch }
                      ),
                    }
              ),
            }
      )
    );

  const patchSet = (
    wIdx: number,
    dIdx: number,
    exIdx: number,
    setIdx: number,
    patch: Partial<BuilderExercise["set_configs"][number]>
  ) =>
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== dIdx
                  ? d
                  : {
                      ...d,
                      exercises: d.exercises.map((ex, k) =>
                        k !== exIdx
                          ? ex
                          : {
                              ...ex,
                              set_configs: ex.set_configs.map((c, s) =>
                                s !== setIdx ? c : { ...c, ...patch }
                              ),
                            }
                      ),
                    }
              ),
            }
      )
    );

  const addSet = (wIdx: number, dIdx: number, exIdx: number) =>
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== dIdx
                  ? d
                  : {
                      ...d,
                      exercises: d.exercises.map((ex, k) =>
                        k !== exIdx
                          ? ex
                          : {
                              ...ex,
                              set_configs: [...ex.set_configs, makeEmptySet()],
                            }
                      ),
                    }
              ),
            }
      )
    );

  const removeSet = (
    wIdx: number,
    dIdx: number,
    exIdx: number,
    setIdx: number
  ) =>
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== dIdx
                  ? d
                  : {
                      ...d,
                      exercises: d.exercises.map((ex, k) =>
                        k !== exIdx
                          ? ex
                          : {
                              ...ex,
                              set_configs: ex.set_configs.filter(
                                (_, s) => s !== setIdx
                              ),
                            }
                      ),
                    }
              ),
            }
      )
    );

  const handleSubmit = async () => {
    setError(null);
    if (meta.name.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    const assignedDays = weeks
      .flatMap((w) => w.days)
      .filter((d) => d.session_id).length;
    if (assignedDays === 0) {
      setError("Asigná al menos una sesión a un día.");
      return;
    }
    setIsSaving(true);
    try {
      let coverUri = meta.cover_image_uri;
      if (selectedFile) coverUri = await uploadImageWeb(selectedFile);
      await savePlan.mutateAsync({
        id: planId,
        values: { ...meta, cover_image_uri: coverUri, weeks },
      });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el plan.");
      setIsSaving(false);
    }
  };

  const week = weeks[activeWeek];
  const isTemplate = meta.duration_weeks === 0;
  const coverSrc = previewUrl ?? mediaUrl(meta.cover_image_uri);

  return (
    <ModalShell maxWidth={720} onClose={onClose}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-jakarta text-[18px] font-bold tracking-tight text-ui-text-main">
          {planId ? "Editar plan" : "Nuevo plan"}
        </h2>
        <button type="button" onClick={onClose}>
          <X size={18} className="text-ui-text-muted" />
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Metadata */}
          <div className="flex flex-col gap-4">
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              className="hidden"
              onChange={handleFile}
            />
            <CoverPicker
              src={coverSrc}
              onPick={() => fileRef.current?.click()}
            />

            <Field label="NOMBRE">
              <Input
                placeholder="Ej: Full body 4 semanas"
                value={meta.name}
                onChange={(e) => setMetaField("name")(e.target.value)}
              />
            </Field>

            <div className="flex gap-4">
              <div className="flex-1">
                <Field label="OBJETIVO">
                  <WebSelect
                    value={meta.objective}
                    onChange={setMetaField("objective")}
                    options={PLAN_OBJECTIVES}
                    placeholder="Sin objetivo"
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="NIVEL">
                  <WebSelect
                    value={meta.level}
                    onChange={setMetaField("level")}
                    options={PLAN_LEVELS}
                    placeholder="Sin nivel"
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Field label="DIRIGIDO A">
                  <WebSelect
                    value={meta.target_gender}
                    onChange={setMetaField("target_gender")}
                    options={PLAN_TARGET_GENDERS}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="DÍAS POR SEMANA">
                  <WebSelect
                    value={String(meta.weekly_days)}
                    onChange={handleWeeklyDays}
                    options={WEEKLY_DAYS_OPTS}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="DURACIÓN">
                  <WebSelect
                    value={String(meta.duration_weeks)}
                    onChange={handleDuration}
                    options={DURATION_OPTS}
                  />
                </Field>
              </div>
            </div>

            <Field label="DESCRIPCIÓN (OPCIONAL)">
              <Textarea
                value={meta.description}
                onChange={(e) => setMetaField("description")(e.target.value)}
                placeholder="Breve descripción del plan..."
                rows={2}
              />
            </Field>
          </div>

          {/* Semanas */}
          <div className="mt-6">
            <p className="mb-2 font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
              {isTemplate ? "Semana tipo" : "Programación"}
            </p>
            {isTemplate ? (
              <p className="mb-4 font-manrope text-[11px] text-ui-text-muted">
                Plan flexible: definís una sola semana y el usuario la repite
                hasta donde quiera.
              </p>
            ) : (
              <div className="mb-4 flex gap-2 overflow-x-auto">
                {weeks.map((w, i) => {
                  const active = i === activeWeek;
                  return (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => setActiveWeek(i)}
                      className={`shrink-0 rounded-[10px] border px-4 py-2 ${
                        active
                          ? "border-brandPrimary-600 bg-brandPrimary-600"
                          : "border-ui-input-border bg-white hover:bg-ui-background-light"
                      }`}
                    >
                      <span
                        className={`font-manrope text-[12px] font-bold ${
                          active ? "text-white" : "text-ui-text-muted"
                        }`}
                      >
                        Semana {w.week_number}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {week?.days.map((day, dIdx) => (
              <DayCard
                key={day.id}
                day={day}
                sessionOpts={sessionOpts}
                onAssign={(sid) => assignSession(activeWeek, dIdx, sid)}
                onPatchExercise={(exIdx, patch) =>
                  patchExercise(activeWeek, dIdx, exIdx, patch)
                }
                onPatchSet={(exIdx, setIdx, patch) =>
                  patchSet(activeWeek, dIdx, exIdx, setIdx, patch)
                }
                onAddSet={(exIdx) => addSet(activeWeek, dIdx, exIdx)}
                onRemoveSet={(exIdx, setIdx) =>
                  removeSet(activeWeek, dIdx, exIdx, setIdx)
                }
              />
            ))}
          </div>

          <FormActions
            onCancel={onClose}
            onSubmit={handleSubmit}
            isPending={savePlan.isPending || isSaving}
            submitLabel="Guardar plan"
          />
        </>
      )}
    </ModalShell>
  );
}

function DayCard({
  day,
  sessionOpts,
  onAssign,
  onPatchExercise,
  onPatchSet,
  onAddSet,
  onRemoveSet,
}: {
  day: BuilderDay;
  sessionOpts: Option[];
  onAssign: (sessionId: string) => void;
  onPatchExercise: (exIdx: number, patch: Partial<BuilderExercise>) => void;
  onPatchSet: (
    exIdx: number,
    setIdx: number,
    patch: Partial<BuilderExercise["set_configs"][number]>
  ) => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-[14px] border border-ui-input-border">
      <div className="flex items-center gap-3 bg-ui-background-light px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brandPrimary-600">
          <span className="font-jakarta text-[12px] font-bold text-white">
            {day.day_number}
          </span>
        </div>
        <span className="font-manrope text-[12px] font-bold text-ui-text-main">
          Día {day.day_number}
        </span>
        <div className="flex-1">
          <WebSelect
            value={day.session_id ?? ""}
            onChange={onAssign}
            options={sessionOpts}
            placeholder="Descanso / sin sesión"
          />
        </div>
      </div>

      {day.session_id && (
        <div className="flex flex-col gap-3 px-4 py-3">
          {day.exercises.length === 0 ? (
            <p className="py-2 text-center font-manrope text-[12px] text-ui-text-muted">
              Esta sesión no tiene ejercicios.
            </p>
          ) : (
            day.exercises.map((ex, exIdx) => (
              <PrescriptionCard
                key={ex.session_exercise_id ?? ex.id ?? exIdx}
                exercise={ex}
                onPatch={(patch) => onPatchExercise(exIdx, patch)}
                onPatchSet={(setIdx, patch) => onPatchSet(exIdx, setIdx, patch)}
                onAddSet={() => onAddSet(exIdx)}
                onRemoveSet={(setIdx) => onRemoveSet(exIdx, setIdx)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PrescriptionCard({
  exercise,
  onPatch,
  onPatchSet,
  onAddSet,
  onRemoveSet,
}: {
  exercise: BuilderExercise;
  onPatch: (patch: Partial<BuilderExercise>) => void;
  onPatchSet: (
    setIdx: number,
    patch: Partial<BuilderExercise["set_configs"][number]>
  ) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}) {
  const isReps = (exercise.prescription_mode ?? "reps") === "reps";
  const hasIntensity = (exercise.intensity_mode ?? "none") !== "none";

  return (
    <div className="rounded-xl border border-ui-input-light bg-white p-3">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brandPrimary-50">
          <Dumbbell size={14} className="text-brandPrimary-600" />
        </div>
        <div className="flex-1">
          <p className="font-manrope text-[13px] font-bold text-ui-text-main">
            {exercise.exercise_name}
          </p>
          {exercise.exercise_muscle_group ? (
            <p className="font-manrope text-[11px] capitalize text-ui-text-muted">
              {exercise.exercise_muscle_group}
            </p>
          ) : null}
        </div>
        <MiniSeg
          options={[
            { label: "Reps", value: "reps" },
            { label: "Tiempo", value: "duration" },
          ]}
          value={exercise.prescription_mode ?? "reps"}
          onChange={(v) => onPatch({ prescription_mode: v })}
        />
      </div>

      {/* Series */}
      <div className="flex flex-col gap-1.5">
        {(exercise.set_configs ?? []).map((cfg, setIdx) => (
          <div key={setIdx} className="flex items-center gap-2">
            <span className="w-4 font-manrope text-[11px] font-bold text-ui-text-muted">
              {setIdx + 1}
            </span>
            <NumCell
              placeholder="kg"
              value={cfg.weight_kg}
              onChange={(v) => onPatchSet(setIdx, { weight_kg: v })}
            />
            {isReps ? (
              <>
                <NumCell
                  placeholder="min"
                  value={cfg.reps_min}
                  onChange={(v) => onPatchSet(setIdx, { reps_min: v })}
                />
                <span className="text-ui-text-muted">–</span>
                <NumCell
                  placeholder="max"
                  value={cfg.reps_max}
                  onChange={(v) => onPatchSet(setIdx, { reps_max: v })}
                />
              </>
            ) : (
              <NumCell
                placeholder="seg"
                value={cfg.duration_seconds}
                onChange={(v) => onPatchSet(setIdx, { duration_seconds: v })}
              />
            )}
            <NumCell
              placeholder="desc"
              value={cfg.rest_seconds}
              onChange={(v) => onPatchSet(setIdx, { rest_seconds: v })}
            />
            <button
              type="button"
              onClick={() => onRemoveSet(setIdx)}
              disabled={(exercise.set_configs ?? []).length <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 transition hover:bg-red-100 disabled:opacity-30"
            >
              <Trash2 size={12} color="#dc2626" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAddSet}
          className="mt-1 rounded-lg border border-dashed border-brandPrimary-300 py-1.5 text-center transition hover:bg-brandPrimary-50"
        >
          <span className="font-manrope text-[11px] font-bold text-brandPrimary-600">
            + Serie
          </span>
        </button>
      </div>

      {/* Intensidad (solo reps) */}
      {isReps && (
        <div className="mt-3 flex items-center gap-2">
          <span className="font-manrope text-[10px] font-bold uppercase tracking-[1px] text-ui-text-muted">
            Intensidad
          </span>
          <MiniSeg
            options={[
              { label: "—", value: "none" },
              { label: "RIR", value: "rir" },
              { label: "RPE", value: "rpe" },
            ]}
            value={exercise.intensity_mode ?? "none"}
            onChange={(v) => onPatch({ intensity_mode: v, rir: null, rpe: null })}
          />
          {hasIntensity && (
            <NumCell
              placeholder={exercise.intensity_mode === "rir" ? "0-5" : "1-10"}
              value={
                exercise.intensity_mode === "rir" ? exercise.rir : exercise.rpe
              }
              onChange={(v) =>
                exercise.intensity_mode === "rir"
                  ? onPatch({ rir: v })
                  : onPatch({ rpe: v })
              }
            />
          )}
        </div>
      )}

      {/* Tempo + notas */}
      <div className="mt-3 flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Tempo (ej. 3-1-1)"
            value={exercise.tempo ?? ""}
            onChange={(e) => onPatch({ tempo: e.target.value })}
            autoCapitalize="none"
          />
        </div>
        <div className="flex-[2]">
          <Input
            placeholder="Notas"
            value={exercise.notes ?? ""}
            onChange={(e) => onPatch({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// Input numérico compacto: devuelve number o null.
function NumCell({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <div className="flex-1 rounded-lg border border-ui-input-border bg-white">
      <input
        value={value == null ? "" : String(value)}
        onChange={(e) => {
          const cleaned = e.target.value.replace(",", ".");
          if (cleaned === "") return onChange(null);
          const n = Number(cleaned);
          if (!Number.isNaN(n)) onChange(n);
        }}
        placeholder={placeholder}
        inputMode="numeric"
        className="w-full bg-transparent px-1 py-2 text-center font-manrope text-[12px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
      />
    </div>
  );
}

function MiniSeg({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-ui-input-border bg-ui-background-light p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-2.5 py-1 ${
              active ? "bg-brandPrimary-600" : "hover:bg-white"
            }`}
          >
            <span
              className={`font-manrope text-[11px] font-bold ${
                active ? "text-white" : "text-ui-text-muted"
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Drawer de detalle ──
function PlanDetailDrawer({
  plan,
  onClose,
  onEdit,
  onDelete,
}: {
  plan: CatalogPlan;
  onClose: () => void;
  onEdit: (p: CatalogPlan) => void;
  onDelete: (p: CatalogPlan) => void;
}) {
  const { data: detail, isLoading } = useCatalogPlanDetail(plan.id);

  const heroUrl = mediaUrl(plan.cover_image_uri);
  const meta = [
    plan.objective ? labelOf(PLAN_OBJECTIVES, plan.objective) : null,
    plan.level ? labelOf(PLAN_LEVELS, plan.level) : null,
    plan.target_gender && plan.target_gender !== "ambos"
      ? labelOf(PLAN_TARGET_GENDERS, plan.target_gender)
      : null,
  ].filter(Boolean);
  const weeks = detail?.weeks ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-[440px] overflow-y-auto border-l border-ui-input-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-jakarta text-[18px] font-bold tracking-tight text-ui-text-main">
              Detalle
            </h2>
            <button type="button" onClick={onClose}>
              <X size={18} className="text-ui-text-muted" />
            </button>
          </div>

          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroUrl}
              alt=""
              className="aspect-square w-full rounded-[18px] object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-[18px] bg-brandPrimary-50">
              <Calendar size={40} className="text-brandPrimary-600" />
            </div>
          )}

          <h3 className="mt-4 font-jakarta text-[20px] font-bold tracking-tight text-ui-text-main">
            {plan.name}
          </h3>
          <p className="mt-1 font-manrope text-[12px] text-ui-text-muted">
            {plan.duration_weeks ? `${plan.duration_weeks} sem` : "Flexible"} ·{" "}
            {plan.weekly_days} días/sem
            {meta.length ? ` · ${meta.join(" · ")}` : ""}
          </p>

          {detail?.description ? (
            <div className="mt-6">
              <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
                DESCRIPCIÓN
              </p>
              <p className="font-manrope text-[13px] leading-5 text-ui-text-main">
                {detail.description}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
              PROGRAMACIÓN
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-brandPrimary-600" />
              </div>
            ) : weeks.length === 0 ? (
              <p className="py-2 font-manrope text-[12px] text-ui-text-muted">
                Este plan no tiene semanas cargadas.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {weeks.map((week) => (
                  <WeekBlock
                    key={week.week_number}
                    week={week}
                    isTemplate={!plan.duration_weeks}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => onEdit(plan)}
              className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-brandPrimary-600 py-2.5 transition hover:bg-brandPrimary-700"
            >
              <Pencil size={14} color="#fff" />
              <span className="font-manrope text-[13px] font-bold text-white">
                Editar
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(plan)}
              className="flex items-center justify-center gap-2 rounded-[11px] bg-red-50 px-5 py-2.5 transition hover:bg-red-100"
            >
              <Trash2 size={14} color="#dc2626" />
              <span className="font-manrope text-[13px] font-bold text-red-600">
                Eliminar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type DetailWeek = NonNullable<
  ReturnType<typeof useCatalogPlanDetail>["data"]
>["weeks"][number];
type DetailDay = DetailWeek["days"][number];

function WeekBlock({
  week,
  isTemplate,
}: {
  week: DetailWeek;
  isTemplate: boolean;
}) {
  const activeDays = (week.days ?? []).filter((d) => d.session_id);
  return (
    <div className="overflow-hidden rounded-[14px] border border-ui-input-border">
      <div className="border-b border-ui-input-light bg-ui-background-light px-4 py-2.5">
        <span className="font-manrope text-[12px] font-bold text-ui-text-main">
          {isTemplate ? "Semana tipo" : `Semana ${week.week_number}`}
        </span>
      </div>
      {activeDays.length === 0 ? (
        <p className="px-4 py-3 font-manrope text-[12px] text-ui-text-muted">
          Sin sesiones asignadas.
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-3">
          {activeDays.map((day) => (
            <DayBlock key={day.day_number} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayBlock({ day }: { day: DetailDay }) {
  const exercises = day.exercises ?? [];
  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brandPrimary-600">
          <span className="font-jakarta text-[11px] font-bold text-white">
            {day.day_number}
          </span>
        </div>
        <span className="flex-1 font-manrope text-[13px] font-bold text-ui-text-main">
          {day.session_name ?? "Sesión"}
        </span>
        <span className="font-manrope text-[11px] text-ui-text-muted">
          {exercises.length} ej.
        </span>
      </div>
      {exercises.length === 0 ? (
        <p className="pl-8 font-manrope text-[11px] text-ui-text-muted">
          Sin ejercicios.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 pl-1">
          {exercises.map((ex, idx) => {
            const setCount = (ex.set_configs ?? []).length;
            const mode =
              (ex.prescription_mode ?? "reps") === "duration"
                ? "tiempo"
                : "reps";
            return (
              <div
                key={ex.session_exercise_id ?? idx}
                className="flex items-center gap-2"
              >
                <Dumbbell size={12} className="text-brandPrimary-600" />
                <span className="flex-1 truncate font-manrope text-[12px] text-ui-text-main">
                  {ex.exercise_name || "Ejercicio"}
                </span>
                <span className="font-manrope text-[11px] font-semibold text-ui-text-muted">
                  {setCount} ser. · {mode}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
