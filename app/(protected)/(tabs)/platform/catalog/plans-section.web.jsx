// Sección PLANES del catálogo (super_admin). Builder web reconstruido de cero que
// escribe directo a Supabase vía el RPC save_catalog_plan (árbol completo en una txn).
// No reutiliza useTrainingPlanForm (persiste a SQLite local, inexistente en web): los
// helpers de estructura viven en plan-week-helpers.js. Ver [[project_default_catalog]].
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Image } from "expo-image";

// Hooks
import {
  useCatalogPlansAdmin,
  useSaveCatalogPlan,
  useDeleteCatalogPlan,
  fetchCatalogPlanDetail,
} from "../../../../../src/hooks/catalog/use-catalog-plans-admin";
import {
  useCatalogSessionsAdmin,
  fetchCatalogSessionExercises,
} from "../../../../../src/hooks/catalog/use-catalog-sessions-admin";

// Form helpers
import { Field, Input, uploadImageWeb } from "../gyms/_form";
import {
  WebSelect,
  CoverPicker,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
} from "./_form-web";

// Helpers de estructura
import {
  buildEmptyWeeks,
  resizeWeeksByDuration,
  resizeWeeksByWeeklyDays,
  makePrescription,
  makeEmptySet,
  padLoadedWeeks,
} from "./plan-week-helpers";

// Constantes / utils / tema
import { PLAN_OBJECTIVES, PLAN_LEVELS } from "../../../../../src/constants/planOptions";
import { PLAN_TARGET_GENDERS } from "../../../../../src/constants/gender-options";
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";

// Iconos
import {
  Calendar,
  Barbell,
  Plus,
  Pencil,
  Trash,
  X,
} from "../../../../../assets/icons";

const WEEKLY_DAYS_OPTS = Array.from({ length: 7 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} día${i === 0 ? "" : "s"}`,
}));
const DURATION_OPTS = Array.from({ length: 16 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} semana${i === 0 ? "" : "s"}`,
}));

const EMPTY_META = {
  name: "",
  description: "",
  objective: "",
  level: "",
  target_gender: "ambos",
  weekly_days: 3,
  duration_weeks: 4,
  cover_image_uri: null,
};

export default function CatalogPlansSection() {
  const { brandPrimary } = useGymTheme();
  const { data: plans = [], isLoading } = useCatalogPlansAdmin();
  const deletePlan = useDeleteCatalogPlan();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openCreate = () => {
    setEditingId(null);
    setBuilderOpen(true);
  };
  const openEdit = (p) => {
    setEditingId(p.id);
    setBuilderOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deletePlan.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      setConfirmDelete(null);
    }
  };

  return (
    <View>
      <View className="mb-6 flex-row items-end justify-between gap-4">
        <Text className="text-xs font-manrope text-ui-text-muted flex-1">
          Planes completos (semanas → días → sesiones → prescripción) armados con
          sesiones del catálogo. Los gimnasios con el catálogo activado los ven
          read-only.
        </Text>
        <Pressable
          onPress={openCreate}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Nuevo plan
          </Text>
        </Pressable>
      </View>

      <View
        className="bg-white rounded-[20px] border border-ui-input-border self-center w-full overflow-hidden"
        style={{ maxWidth: 880 }}
      >
        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="small" color={brandPrimary[600]} />
          </View>
        ) : plans.length === 0 ? (
          <View className="py-20 items-center px-8">
            <View className="w-12 h-12 rounded-[14px] bg-brandPrimary-50 items-center justify-center mb-3">
              <Calendar size={20} color={brandPrimary[600]} />
            </View>
            <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
              No hay planes de catálogo
            </Text>
            <Text className="text-xs font-manrope text-ui-text-muted">
              Creá el primero con “Nuevo plan”.
            </Text>
          </View>
        ) : (
          plans.map((p, i) => (
            <PlanRow
              key={p.id}
              plan={p}
              first={i === 0}
              onEdit={() => openEdit(p)}
              onDelete={() => setConfirmDelete(p)}
              brandPrimary={brandPrimary}
            />
          ))
        )}
      </View>

      {builderOpen && (
        <PlanBuilderModal
          planId={editingId}
          onClose={() => setBuilderOpen(false)}
          brandPrimary={brandPrimary}
        />
      )}

      <DeleteConfirmModal
        visible={!!confirmDelete}
        title="Eliminar plan"
        message={`Vas a quitar “${confirmDelete?.name}” del catálogo. Los gimnasios dejarán de verlo.`}
        isPending={deletePlan.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

function PlanRow({ plan, first, onEdit, onDelete, brandPrimary }) {
  const thumb = plan.cover_image_uri
    ? getCloudinaryUrl(plan.cover_image_uri, "w_96,h_96,c_fill,f_auto,q_auto") ||
      plan.cover_image_uri
    : null;
  return (
    <View
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        first ? "" : "border-t border-ui-input-light"
      }`}
    >
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={{ width: 44, height: 44, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : (
        <View className="w-11 h-11 rounded-[10px] bg-brandPrimary-50 items-center justify-center">
          <Calendar size={16} color={brandPrimary[600]} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-[14px] font-manrope-bold text-ui-text-main">
          {plan.name}
        </Text>
        <Text className="text-[11px] font-manrope text-ui-text-muted mt-0.5 capitalize">
          {plan.duration_weeks} sem · {plan.weekly_days} días/sem
          {plan.objective ? ` · ${plan.objective}` : ""}
        </Text>
      </View>
      <Pressable
        onPress={onEdit}
        className="w-9 h-9 rounded-[10px] items-center justify-center bg-ui-background-light hover:bg-ui-input-light"
        style={{ cursor: "pointer" }}
      >
        <Pencil size={14} color={ui.text.main} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        className="w-9 h-9 rounded-[10px] items-center justify-center bg-red-50 hover:bg-red-100"
        style={{ cursor: "pointer" }}
      >
        <Trash size={14} color="#dc2626" />
      </Pressable>
    </View>
  );
}

function PlanBuilderModal({ planId, onClose, brandPrimary }) {
  const savePlan = useSaveCatalogPlan();
  const { data: sessions = [] } = useCatalogSessionsAdmin();

  const [meta, setMeta] = useState(EMPTY_META);
  const [weeks, setWeeks] = useState(() => buildEmptyWeeks(4, 3));
  const [activeWeek, setActiveWeek] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!!planId);
  const fileRef = useRef(null);

  const sessionOpts = useMemo(
    () => sessions.map((s) => ({ value: s.id, label: s.name })),
    [sessions]
  );

  // Hidratar en edición
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
        if (!cancelled) setError(err?.message || "No se pudo cargar el plan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const setMetaField = (key) => (v) => setMeta((p) => ({ ...p, [key]: v }));

  const handleDuration = (val) => {
    const n = parseInt(val, 10) || 1;
    setMeta((p) => ({ ...p, duration_weeks: n }));
    setWeeks((w) => resizeWeeksByDuration(w, n, meta.weekly_days));
    setActiveWeek((a) => Math.min(a, n - 1));
  };
  const handleWeeklyDays = (val) => {
    const n = parseInt(val, 10) || 1;
    setMeta((p) => ({ ...p, weekly_days: n }));
    setWeeks((w) => resizeWeeksByWeeklyDays(w, n));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ─── Mutaciones del árbol ──────────────────────────────────────────────────
  const patchDay = (wIdx, dIdx, patch) =>
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== dIdx ? d : { ...d, ...patch }
              ),
            }
      )
    );

  const assignSession = async (wIdx, dIdx, sessionId) => {
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
        exercises: ses.map((se, idx) => makePrescription(se, idx)),
      });
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los ejercicios.");
    }
  };

  const patchExercise = (wIdx, dIdx, exIdx, patch) =>
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

  const patchSet = (wIdx, dIdx, exIdx, setIdx, patch) =>
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

  const addSet = (wIdx, dIdx, exIdx) =>
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
                          : { ...ex, set_configs: [...ex.set_configs, makeEmptySet()] }
                      ),
                    }
              ),
            }
      )
    );

  const removeSet = (wIdx, dIdx, exIdx, setIdx) =>
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
    try {
      let coverUri = meta.cover_image_uri;
      if (selectedFile) coverUri = await uploadImageWeb(selectedFile);
      await savePlan.mutateAsync({
        id: planId,
        values: { ...meta, cover_image_uri: coverUri, weeks },
      });
      onClose();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el plan.");
    }
  };

  const week = weeks[activeWeek];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <ScrollView
          className="bg-white rounded-[20px] border border-ui-input-border w-full"
          style={{ maxWidth: 720, maxHeight: "94%" }}
          contentContainerStyle={{ padding: 28 }}
        >
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-[18px] font-jakarta-bold text-ui-text-main tracking-tight">
              {planId ? "Editar plan" : "Nuevo plan"}
            </Text>
            <Pressable onPress={onClose} style={{ cursor: "pointer" }}>
              <X size={18} color={ui.text.muted} />
            </Pressable>
          </View>

          <ErrorBanner message={error} />

          {loading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="small" color={brandPrimary[600]} />
            </View>
          ) : (
            <>
              {/* ── Metadata ── */}
              <View className="gap-y-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
                <CoverPicker
                  previewUrl={previewUrl}
                  imageUri={meta.cover_image_uri}
                  onPick={() => fileRef.current?.click()}
                  brandPrimary={brandPrimary}
                />

                <Field label="NOMBRE">
                  <Input
                    placeholder="Ej: Full body 4 semanas"
                    value={meta.name}
                    onChangeText={setMetaField("name")}
                  />
                </Field>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Field label="OBJETIVO">
                      <WebSelect
                        value={meta.objective}
                        onChange={setMetaField("objective")}
                        options={PLAN_OBJECTIVES}
                        placeholder="Sin objetivo"
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="NIVEL">
                      <WebSelect
                        value={meta.level}
                        onChange={setMetaField("level")}
                        options={PLAN_LEVELS}
                        placeholder="Sin nivel"
                      />
                    </Field>
                  </View>
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Field label="DIRIGIDO A">
                      <WebSelect
                        value={meta.target_gender}
                        onChange={setMetaField("target_gender")}
                        options={PLAN_TARGET_GENDERS}
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="DÍAS POR SEMANA">
                      <WebSelect
                        value={String(meta.weekly_days)}
                        onChange={handleWeeklyDays}
                        options={WEEKLY_DAYS_OPTS}
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="DURACIÓN">
                      <WebSelect
                        value={String(meta.duration_weeks)}
                        onChange={handleDuration}
                        options={DURATION_OPTS}
                      />
                    </Field>
                  </View>
                </View>

                <Field label="DESCRIPCIÓN (OPCIONAL)">
                  <TextInput
                    value={meta.description}
                    onChangeText={setMetaField("description")}
                    placeholder="Breve descripción del plan..."
                    placeholderTextColor={ui.text.muted}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    className="font-manrope rounded-xl min-h-16 p-3.5 bg-white text-ui-text-main text-[13px] border border-ui-input-border"
                    style={{ outlineWidth: 0 }}
                  />
                </Field>
              </View>

              {/* ── Semanas (tabs) ── */}
              <View className="mt-6">
                <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase mb-2">
                  Programación
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  className="mb-4"
                >
                  {weeks.map((w, i) => {
                    const active = i === activeWeek;
                    return (
                      <Pressable
                        key={w.id}
                        onPress={() => setActiveWeek(i)}
                        className={`px-4 py-2 rounded-[10px] border ${
                          active
                            ? "bg-brandPrimary-600 border-brandPrimary-600"
                            : "bg-white border-ui-input-border hover:bg-ui-background-light"
                        }`}
                        style={{ cursor: "pointer" }}
                      >
                        <Text
                          className={`text-[12px] font-manrope-bold ${
                            active ? "text-white" : "text-ui-text-muted"
                          }`}
                        >
                          Semana {w.week_number}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Días de la semana activa */}
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
                    brandPrimary={brandPrimary}
                  />
                ))}
              </View>

              <FormActions
                onCancel={onClose}
                onSubmit={handleSubmit}
                isPending={savePlan.isPending}
                submitLabel="Guardar plan"
              />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
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
  brandPrimary,
}) {
  return (
    <View className="mb-3 rounded-[14px] border border-ui-input-border overflow-hidden">
      <View className="flex-row items-center gap-3 px-4 py-3 bg-ui-background-light">
        <View className="w-7 h-7 rounded-lg bg-brandPrimary-600 items-center justify-center">
          <Text className="text-[12px] font-jakarta-bold text-white">
            {day.day_number}
          </Text>
        </View>
        <Text className="text-[12px] font-manrope-bold text-ui-text-main">
          Día {day.day_number}
        </Text>
        <View className="flex-1">
          <WebSelect
            value={day.session_id}
            onChange={onAssign}
            options={sessionOpts}
            placeholder="Descanso / sin sesión"
          />
        </View>
      </View>

      {day.session_id && (
        <View className="px-4 py-3 gap-y-3">
          {day.exercises.length === 0 ? (
            <Text className="text-[12px] font-manrope text-ui-text-muted py-2 text-center">
              Esta sesión no tiene ejercicios.
            </Text>
          ) : (
            day.exercises.map((ex, exIdx) => (
              <PrescriptionCard
                key={ex.session_exercise_id ?? ex.id ?? exIdx}
                exercise={ex}
                onPatch={(patch) => onPatchExercise(exIdx, patch)}
                onPatchSet={(setIdx, patch) =>
                  onPatchSet(exIdx, setIdx, patch)
                }
                onAddSet={() => onAddSet(exIdx)}
                onRemoveSet={(setIdx) => onRemoveSet(exIdx, setIdx)}
                brandPrimary={brandPrimary}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function PrescriptionCard({
  exercise,
  onPatch,
  onPatchSet,
  onAddSet,
  onRemoveSet,
  brandPrimary,
}) {
  const isReps = (exercise.prescription_mode ?? "reps") === "reps";
  const hasIntensity = (exercise.intensity_mode ?? "none") !== "none";

  return (
    <View className="rounded-xl border border-ui-input-light bg-white p-3">
      <View className="flex-row items-center gap-2.5 mb-3">
        <View className="w-8 h-8 rounded-lg bg-brandPrimary-50 items-center justify-center">
          <Barbell size={14} color={brandPrimary[600]} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-manrope-bold text-ui-text-main">
            {exercise.exercise_name}
          </Text>
          {exercise.exercise_muscle_group ? (
            <Text className="text-[11px] font-manrope text-ui-text-muted capitalize">
              {exercise.exercise_muscle_group}
            </Text>
          ) : null}
        </View>
        <MiniSeg
          options={[
            { label: "Reps", value: "reps" },
            { label: "Tiempo", value: "duration" },
          ]}
          value={exercise.prescription_mode ?? "reps"}
          onChange={(v) => onPatch({ prescription_mode: v })}
        />
      </View>

      {/* Series */}
      <View className="gap-y-1.5">
        {(exercise.set_configs ?? []).map((cfg, setIdx) => (
          <View key={setIdx} className="flex-row items-center gap-2">
            <Text className="text-[11px] font-manrope-bold text-ui-text-muted w-4">
              {setIdx + 1}
            </Text>
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
                <Text className="text-ui-text-muted">–</Text>
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
            <Pressable
              onPress={() => onRemoveSet(setIdx)}
              disabled={(exercise.set_configs ?? []).length <= 1}
              className="w-7 h-7 rounded-lg items-center justify-center bg-red-50 hover:bg-red-100"
              style={{
                cursor: "pointer",
                opacity: (exercise.set_configs ?? []).length <= 1 ? 0.3 : 1,
              }}
            >
              <Trash size={12} color="#dc2626" />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={onAddSet}
          className="mt-1 py-1.5 rounded-lg border border-dashed border-brandPrimary-300 items-center hover:bg-brandPrimary-50"
          style={{ cursor: "pointer" }}
        >
          <Text className="text-[11px] font-manrope-bold text-brandPrimary-600">
            + Serie
          </Text>
        </Pressable>
      </View>

      {/* Intensidad (solo reps) */}
      {isReps && (
        <View className="flex-row items-center gap-2 mt-3">
          <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1px] uppercase">
            Intensidad
          </Text>
          <MiniSeg
            options={[
              { label: "—", value: "none" },
              { label: "RIR", value: "rir" },
              { label: "RPE", value: "rpe" },
            ]}
            value={exercise.intensity_mode ?? "none"}
            onChange={(v) =>
              onPatch({ intensity_mode: v, rir: null, rpe: null })
            }
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
        </View>
      )}

      {/* Tempo + notas */}
      <View className="flex-row gap-2 mt-3">
        <View className="flex-1">
          <Input
            placeholder="Tempo (ej. 3-1-1)"
            value={exercise.tempo ?? ""}
            onChangeText={(v) => onPatch({ tempo: v })}
            autoCapitalize="none"
          />
        </View>
        <View className="flex-[2]">
          <Input
            placeholder="Notas"
            value={exercise.notes ?? ""}
            onChangeText={(v) => onPatch({ notes: v })}
          />
        </View>
      </View>
    </View>
  );
}

// Input numérico compacto: devuelve number o null.
function NumCell({ value, onChange, placeholder }) {
  return (
    <View className="flex-1 bg-white rounded-lg border border-ui-input-border">
      <TextInput
        value={value == null ? "" : String(value)}
        onChangeText={(t) => {
          const cleaned = t.replace(",", ".");
          if (cleaned === "") return onChange(null);
          const n = Number(cleaned);
          if (!Number.isNaN(n)) onChange(n);
        }}
        placeholder={placeholder}
        placeholderTextColor={ui.text.muted}
        keyboardType="numeric"
        className="text-[12px] font-manrope text-ui-text-main text-center px-1 py-2"
        style={{ outlineWidth: 0 }}
      />
    </View>
  );
}

// Segmented compacto para reps/tiempo e intensidad.
function MiniSeg({ options, value, onChange }) {
  return (
    <View className="flex-row gap-1 bg-ui-background-light rounded-lg p-0.5 border border-ui-input-border">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`px-2.5 py-1 rounded-md ${
              active ? "bg-brandPrimary-600" : "hover:bg-white"
            }`}
            style={{ cursor: "pointer" }}
          >
            <Text
              className={`text-[11px] font-manrope-bold ${
                active ? "text-white" : "text-ui-text-muted"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
