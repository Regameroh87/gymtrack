// Drawer lateral de DETALLE de un plan del catálogo (super_admin, web).
// Read-only: muestra metadata del plan y el árbol semanas → días → sesiones → ejercicios
// (traído con useCatalogPlanDetail). Editar/Eliminar delegan a los flujos del section
// padre. Espeja _exercise-detail-web.jsx / _session-detail-web.jsx. Ver [[project_default_catalog]].
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";

import { useCatalogPlanDetail } from "../../../../../src/hooks/catalog/use-catalog-plans-admin";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import {
  PLAN_OBJECTIVES,
  PLAN_LEVELS,
} from "../../../../../src/constants/planOptions";
import { PLAN_TARGET_GENDERS } from "../../../../../src/constants/gender-options";
import {
  Calendar,
  Barbell,
  Pencil,
  Trash,
  X,
} from "../../../../../assets/icons";

// Devuelve el label legible de un value crudo; si no hay match usa el value tal cual.
const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label ?? value;

export default function PlanDetailDrawer({ plan, onClose, onEdit, onDelete }) {
  const { brandPrimary } = useGymTheme();
  const { data: detail, isLoading } = useCatalogPlanDetail(plan?.id);
  if (!plan) return null;

  const heroUrl = plan.cover_image_uri
    ? getCloudinaryUrl(
        plan.cover_image_uri,
        "w_480,h_480,c_fill,f_auto,q_auto"
      ) || plan.cover_image_uri
    : null;

  const meta = [
    plan.objective ? labelOf(PLAN_OBJECTIVES, plan.objective) : null,
    plan.level ? labelOf(PLAN_LEVELS, plan.level) : null,
    plan.target_gender && plan.target_gender !== "ambos"
      ? labelOf(PLAN_TARGET_GENDERS, plan.target_gender)
      : null,
  ].filter(Boolean);

  const weeks = detail?.weeks ?? [];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 flex-row justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.45)", cursor: "auto" }}
      >
        {/* El panel detiene la propagación: tocar adentro no cierra el drawer. */}
        <Pressable
          onPress={() => {}}
          className="h-full bg-white border-l border-ui-input-border w-full"
          style={{ maxWidth: 440, cursor: "auto" }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-jakarta-bold text-ui-text-main tracking-tight">
                Detalle
              </Text>
              <Pressable onPress={onClose} style={{ cursor: "pointer" }}>
                <X size={18} color={ui.text.muted} />
              </Pressable>
            </View>

            {/* Hero */}
            {heroUrl ? (
              <Image
                source={{ uri: heroUrl }}
                style={{ width: "100%", aspectRatio: 1, borderRadius: 18 }}
                contentFit="cover"
              />
            ) : (
              <View
                className="w-full rounded-[18px] bg-brandPrimary-50 items-center justify-center"
                style={{ aspectRatio: 1 }}
              >
                <Calendar size={40} color={brandPrimary[600]} />
              </View>
            )}

            {/* Nombre + metadata */}
            <Text className="text-[20px] font-jakarta-bold text-ui-text-main tracking-tight mt-4">
              {plan.name}
            </Text>
            <Text className="text-[12px] font-manrope text-ui-text-muted mt-1">
              {plan.duration_weeks ? `${plan.duration_weeks} sem` : "Flexible"}{" "}
              · {plan.weekly_days} días/sem
              {meta.length ? ` · ${meta.join(" · ")}` : ""}
            </Text>

            {/* Descripción */}
            {detail?.description ? (
              <View className="mt-6">
                <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                  DESCRIPCIÓN
                </Text>
                <Text className="text-[13px] font-manrope text-ui-text-main leading-5">
                  {detail.description}
                </Text>
              </View>
            ) : null}

            {/* Programación */}
            <View className="mt-6">
              <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                PROGRAMACIÓN
              </Text>
              {isLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color={brandPrimary[600]} />
                </View>
              ) : weeks.length === 0 ? (
                <Text className="text-[12px] font-manrope text-ui-text-muted py-2">
                  Este plan no tiene semanas cargadas.
                </Text>
              ) : (
                <View className="gap-y-4">
                  {weeks.map((week) => (
                    <WeekBlock
                      key={week.week_number}
                      week={week}
                      isTemplate={!plan.duration_weeks}
                      brandPrimary={brandPrimary}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Acciones */}
            <View className="flex-row gap-3 mt-8">
              <Pressable
                onPress={() => onEdit(plan)}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700"
                style={{ cursor: "pointer" }}
              >
                <Pencil size={14} color="#fff" />
                <Text className="text-[13px] font-manrope-bold text-white">
                  Editar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(plan)}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] bg-red-50 hover:bg-red-100"
                style={{ cursor: "pointer" }}
              >
                <Trash size={14} color="#dc2626" />
                <Text className="text-[13px] font-manrope-bold text-red-600">
                  Eliminar
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Bloque de una semana: encabezado + sus días con sesión asignada.
function WeekBlock({ week, isTemplate, brandPrimary }) {
  const activeDays = (week.days ?? []).filter((d) => d.session_id);
  return (
    <View className="rounded-[14px] border border-ui-input-border overflow-hidden">
      <View className="px-4 py-2.5 bg-ui-background-light border-b border-ui-input-light">
        <Text className="text-[12px] font-manrope-bold text-ui-text-main">
          {isTemplate ? "Semana tipo" : `Semana ${week.week_number}`}
        </Text>
      </View>
      {activeDays.length === 0 ? (
        <Text className="text-[12px] font-manrope text-ui-text-muted px-4 py-3">
          Sin sesiones asignadas.
        </Text>
      ) : (
        <View className="px-4 py-3 gap-y-3">
          {activeDays.map((day) => (
            <DayBlock
              key={day.day_number}
              day={day}
              brandPrimary={brandPrimary}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Bloque de un día: número + sesión + resumen de cada ejercicio.
function DayBlock({ day, brandPrimary }) {
  const exercises = day.exercises ?? [];
  return (
    <View>
      <View className="flex-row items-center gap-2.5 mb-2">
        <View className="w-6 h-6 rounded-md bg-brandPrimary-600 items-center justify-center">
          <Text className="text-[11px] font-jakarta-bold text-white">
            {day.day_number}
          </Text>
        </View>
        <Text className="text-[13px] font-manrope-bold text-ui-text-main flex-1">
          {day.session_name ?? "Sesión"}
        </Text>
        <Text className="text-[11px] font-manrope text-ui-text-muted">
          {exercises.length} ej.
        </Text>
      </View>
      {exercises.length === 0 ? (
        <Text className="text-[11px] font-manrope text-ui-text-muted pl-8">
          Sin ejercicios.
        </Text>
      ) : (
        <View className="gap-y-1.5 pl-1">
          {exercises.map((ex, idx) => {
            const setCount = (ex.set_configs ?? []).length;
            const mode =
              (ex.prescription_mode ?? "reps") === "duration"
                ? "tiempo"
                : "reps";
            return (
              <View
                key={ex.session_exercise_id ?? idx}
                className="flex-row items-center gap-2"
              >
                <Barbell size={12} color={brandPrimary[600]} />
                <Text
                  className="text-[12px] font-manrope text-ui-text-main flex-1"
                  numberOfLines={1}
                >
                  {ex.exercise_name || "Ejercicio"}
                </Text>
                <Text className="text-[11px] font-manrope-semi text-ui-text-muted">
                  {setCount} ser. · {mode}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
