"use client";

// Builder de PLAN del gym (página completa). Copia directa del builder probado del
// catálogo (components/platform/catalog/plans-section.tsx) pasado a página y con las
// fuentes cambiadas a las del gym (sesiones del gym + save/delete client-side).
// Metadata → semanas → días → sesiones → prescripción por serie. Port de apps/mobile
// admin/plans/builder + [id].

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  useSaveAdminPlan,
  useDeleteAdminPlan,
  useToggleAdminPlanPublish,
  useAdminSessionsList,
  fetchAdminSessionExercises,
  isWeeksComplete,
  type AdminPlanDetail,
  type AdminPlanMeta,
} from "@/lib/hooks/use-admin-plans";
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
} from "@/components/platform/catalog/catalog-ui";

const WEEKLY_DAYS_OPTS: Option[] = Array.from({ length: 6 }, (_, i) => ({
  value: String(i + 2),
  label: `${i + 2} días`,
}));
const DURATION_OPTS: Option[] = [
  { value: "0", label: "Flexible · semana tipo" },
  ...Array.from({ length: 16 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} semana${i === 0 ? "" : "s"}`,
  })),
];

const EMPTY_META: AdminPlanMeta = {
  name: "",
  description: "",
  objective: "",
  level: "",
  target_gender: "ambos",
  weekly_days: 3,
  duration_weeks: 4,
  cover_image_uri: null,
};

export function AdminPlanForm({
  gymId,
  initial,
}: {
  gymId: string | null;
  initial: AdminPlanDetail | null;
}) {
  const router = useRouter();
  const savePlan = useSaveAdminPlan(gymId);
  const deletePlan = useDeleteAdminPlan();
  const togglePublish = useToggleAdminPlanPublish();
  const { data: sessions = [] } = useAdminSessionsList(gymId);
  const editingId = initial?.id ?? null;

  const [meta, setMeta] = useState<AdminPlanMeta>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description,
          objective: initial.objective,
          level: initial.level,
          target_gender: initial.target_gender,
          weekly_days: initial.weekly_days,
          duration_weeks: initial.duration_weeks,
          cover_image_uri: initial.cover_image_uri || null,
        }
      : EMPTY_META
  );
  const [weeks, setWeeks] = useState<BuilderWeek[]>(() =>
    initial
      ? padLoadedWeeks(initial.weeks, initial.weekly_days)
      : buildEmptyWeeks(4, 3)
  );
  const [published, setPublished] = useState<boolean>(
    initial?.is_published ?? false
  );
  const [activeWeek, setActiveWeek] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sessionOpts: Option[] = useMemo(
    () => sessions.map((s) => ({ value: s.id, label: s.name })),
    [sessions]
  );

  const setMetaField =
    <K extends keyof AdminPlanMeta>(key: K) =>
    (v: AdminPlanMeta[K]) =>
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
      const ses = await fetchAdminSessionExercises(sessionId);
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
    if (!editingId && !gymId) {
      setError("No hay un gimnasio activo.");
      return;
    }
    setIsSaving(true);
    try {
      let coverUri = meta.cover_image_uri;
      if (selectedFile) coverUri = await uploadImageWeb(selectedFile);
      await savePlan.mutateAsync({
        id: editingId,
        values: { ...meta, cover_image_uri: coverUri, weeks },
      });
      router.push("/admin/plans");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el plan.");
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!editingId) return;
    setError(null);
    if (!published) {
      // Para publicar, el plan debe estar completo.
      if (!isWeeksComplete(weeks, meta.weekly_days, meta.duration_weeks)) {
        setError(
          "Plan incompleto: asigná una sesión con ejercicios a cada día antes de publicar."
        );
        return;
      }
    }
    try {
      await togglePublish.mutateAsync({ id: editingId, publish: !published });
      setPublished((p) => !p);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo cambiar el estado.");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await deletePlan.mutateAsync(editingId);
      router.push("/admin/plans");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo eliminar el plan.");
      setConfirmDelete(false);
    }
  };

  const week = weeks[activeWeek];
  const isTemplate = meta.duration_weeks === 0;
  const coverSrc = previewUrl ?? mediaUrl(meta.cover_image_uri);

  return (
    <div className="p-4 pb-14 md:p-9">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/plans")}
          className="mb-1.5 flex items-center gap-1 transition hover:opacity-70"
        >
          <ArrowLeft size={11} className="text-ui-text-muted" />
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
            Planes
          </span>
        </button>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
              {editingId ? "Editar plan" : "Crear plan"}
            </h1>
            <p className="mt-1 font-manrope text-xs text-ui-text-muted">
              Semanas → días → sesiones → prescripción por serie
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={togglePublish.isPending}
              className={`flex items-center gap-2 rounded-[11px] px-4 py-2.5 font-manrope text-[13px] font-bold transition ${
                published
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border border-ui-input-border bg-white text-ui-text-main hover:bg-ui-background-light"
              }`}
            >
              {published ? <Eye size={15} /> : <EyeOff size={15} />}
              {published ? "Publicado" : "Borrador"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[720px] rounded-[20px] border border-ui-input-border bg-white p-8">
        <ErrorBanner message={error} />

        {/* Metadata */}
        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            className="hidden"
            onChange={handleFile}
          />
          <CoverPicker src={coverSrc} onPick={() => fileRef.current?.click()} />

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
              Plan flexible: definís una sola semana y el usuario la repite hasta
              donde quiera.
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
          onCancel={() => router.push("/admin/plans")}
          onSubmit={handleSubmit}
          isPending={savePlan.isPending || isSaving}
          submitLabel={editingId ? "Guardar cambios" : "Guardar plan"}
        />

        {editingId && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[11px] border border-red-200 bg-white py-2.5 font-manrope text-[13px] font-bold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} color="#dc2626" />
            Eliminar plan
          </button>
        )}
      </div>

      <DeleteConfirmModal
        visible={confirmDelete}
        title="Eliminar plan"
        message={`Vas a eliminar “${meta.name}” y toda su programación. Las asignaciones a miembros se cancelan. Esta acción no se puede deshacer.`}
        isPending={deletePlan.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
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
