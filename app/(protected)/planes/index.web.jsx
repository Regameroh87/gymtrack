// React Native
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState, useMemo } from "react";

// Librerías
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// Auth / Hooks
import { useAuth } from "../../../src/auth/lib/getSession.jsx";
import { useTrainingPlans } from "../../../src/hooks/plans/use-training-plans.js";
import { usePlanAssignments } from "../../../src/hooks/plans/use-plan-assignments.js";
import { useDropPlan } from "../../../src/hooks/plans/use-assign-plan.js";

// Utilidades
import { getCloudinaryUrl } from "../../../src/utils/cloudinary.js";

// Componentes
import MemberNavbar from "../../../src/components/web/MemberNavbar.jsx";

// Tema / assets
import { brandPrimary, brandSecondary } from "../../../src/theme/colors.js";
import {
  Barbell,
  Calendar,
  ChartBar,
  ChevronRight,
  ClipboardList,
  Clock,
  Logs,
  Plus,
  ShieldHalf,
} from "../../../assets/icons.jsx";

// ─── Constantes ──────────────────────────────────────────────────────────────
const BRAND_FALLBACK_GRADIENT = ["#0C0B14", "#1e1b4b", "#3023cd"];

const OBJECTIVE_CONFIG = {
  hipertrofia:       { Icon: Barbell,    label: "Hipertrofia" },
  fuerza:            { Icon: Barbell,    label: "Fuerza" },
  perdida_grasa:     { Icon: ChartBar,   label: "Pérdida de grasa" },
  resistencia:       { Icon: Clock,      label: "Resistencia" },
  acondicionamiento: { Icon: Logs,       label: "Acondicionamiento" },
  rehabilitacion:    { Icon: ShieldHalf, label: "Rehabilitación" },
};
const DEFAULT_CONFIG = { Icon: Barbell, label: null };

const MAIN_TABS = [
  { key: "mis_planes", label: "Mis Planes" },
  { key: "catalogo",   label: "Catálogo" },
];

// ─── Página ──────────────────────────────────────────────────────────────────
export default function RutinasWeb() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("mis_planes");

  return (
    <View className="flex-1 bg-ui-background-light">
      <MemberNavbar />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 1080 }}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <View className="flex-row items-end justify-between mb-7">
            <View>
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <View className="w-7 h-[3px] rounded-full bg-brandSecondary-400" />
                <View className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: "rgba(42,232,204,0.4)" }} />
              </View>
              <Text className="text-[10px] font-manrope-bold uppercase tracking-[2.4px] text-brandPrimary-600 mb-1">
                Mi Entrenamiento
              </Text>
              <Text className="font-jakarta-bold text-ui-text-main" style={{ fontSize: 38, lineHeight: 42, letterSpacing: -1.4 }}>
                Planes
              </Text>
            </View>

            {activeTab === "mis_planes" && (
              <Pressable
                onPress={() => router.push("/planes/builder/custom-plan")}
                className="flex-row items-center gap-2 px-4 py-[11px] rounded-2xl bg-brandPrimary-600"
                style={({ hovered, pressed }) => ({
                  cursor: "pointer",
                  shadowColor: brandPrimary[600],
                  shadowOpacity: hovered ? 0.45 : 0.28,
                  shadowRadius: hovered ? 14 : 10,
                  shadowOffset: { width: 0, height: 4 },
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View
                  className="w-[22px] h-[22px] rounded-full items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                >
                  <Plus size={13} color="#fff" />
                </View>
                <Text className="text-[11px] font-manrope-bold uppercase tracking-[1.4px] text-white">
                  Crear rutina
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Tabs ────────────────────────────────────────────────── */}
          <View className="flex-row items-center border-b border-ui-input-border mb-7">
            {MAIN_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className="mr-7 pb-3.5 relative"
                  style={{ cursor: "pointer" }}
                >
                  <Text
                    className={`text-sm tracking-tight ${
                      active
                        ? "font-jakarta-bold text-ui-text-main"
                        : "font-manrope-semi text-ui-text-muted"
                    }`}
                  >
                    {tab.label}
                  </Text>
                  {active && (
                    <View className="absolute left-0 right-0 bottom-[-1px] h-[2.5px] rounded-full bg-brandPrimary-600" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── Contenido ─────────────────────────────────────────── */}
          {activeTab === "mis_planes" ? (
            <MisPlanesContent router={router} onBrowseCatalog={() => setActiveTab("catalogo")} />
          ) : (
            <CatalogoContent router={router} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Tab: Mis Planes ─────────────────────────────────────────────────────────
function MisPlanesContent({ router, onBrowseCatalog }) {
  const { userId } = useAuth();
  const { data: assignments, isLoading } = usePlanAssignments();
  const { mutate: dropPlan, isPending: isDropping } = useDropPlan();

  if (isLoading) {
    return (
      <View className="py-16 items-center">
        <Text className="text-xs font-manrope text-ui-text-muted">Cargando planes...</Text>
      </View>
    );
  }

  const currentPlan     = assignments?.currentPlan ?? null;
  const history         = assignments?.history ?? [];
  const assignedByCoach = currentPlan && currentPlan.assigned_by !== userId;

  const planObj = currentPlan ? {
    id:              currentPlan.plan_id,
    name:            currentPlan.plan_name,
    cover_image_uri: currentPlan.plan_cover,
    objective:       currentPlan.plan_objective,
    level:           currentPlan.plan_level,
    weekly_days:     currentPlan.plan_weekly_days,
    duration_weeks:  currentPlan.plan_duration_weeks,
  } : null;

  return (
    <View className="flex-row items-start gap-5">

      {/* ── Columna izquierda: plan actual ── */}
      <View style={{ flex: 1.6 }}>
        <Text className="text-[10px] font-manrope-bold uppercase tracking-[1.5px] text-ui-text-muted mb-3">
          Plan actual
        </Text>

        {planObj ? (
          <>
            {assignedByCoach && (
              <View className="flex-row items-center gap-2 mb-2.5 pl-1">
                <View
                  className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400"
                  style={{ shadowColor: brandSecondary[400], shadowOpacity: 0.8, shadowRadius: 5 }}
                />
                <Text className="text-[9px] font-manrope-bold uppercase tracking-[1.6px] text-brandSecondary-700">
                  Asignado por tu entrenador
                </Text>
              </View>
            )}

            <PlanCardWeb
              plan={planObj}
              index={0}
              onPress={() => router.push(`/planes/plan/${currentPlan.plan_id}`)}
            />

            <Pressable
              disabled={isDropping}
              onPress={() => dropPlan({ assignmentId: currentPlan.id })}
              className="mt-3.5 self-center px-3.5 py-2 rounded-full"
              style={({ hovered, pressed }) => ({
                cursor: "pointer",
                backgroundColor: hovered || pressed ? "rgba(239,68,68,0.08)" : "transparent",
                opacity: isDropping ? 0.5 : 1,
              })}
            >
              <Text className="text-[11px] font-manrope-semi" style={{ color: "#ef4444" }}>
                {isDropping ? "Abandonando…" : "Abandonar este plan"}
              </Text>
            </Pressable>
          </>
        ) : (
          <EmptyCurrentPlan onBrowseCatalog={onBrowseCatalog} />
        )}
      </View>

      {/* ── Columna derecha: historial ── */}
      <View className="flex-1">
        <Text className="text-[10px] font-manrope-bold uppercase tracking-[1.5px] text-ui-text-muted mb-3">
          Historial
        </Text>

        {history.length === 0 ? (
          <View className="bg-ui-surface-light border border-ui-input-border rounded-[18px] p-5">
            <View className="flex-row items-center gap-1.5 mb-2">
              <View className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgba(15,13,32,0.25)" }} />
              <Text className="text-[9px] font-manrope-bold uppercase tracking-[1.6px] text-ui-text-muted">
                Sin registros
              </Text>
            </View>
            <Text className="text-sm font-jakarta-bold text-ui-text-main tracking-tight mb-1">
              Tu historial aparecerá acá
            </Text>
            <Text className="text-xs font-manrope text-ui-text-muted leading-[18px]">
              Cuando completes o abandones un plan, lo vas a ver listado.
            </Text>
          </View>
        ) : (
          <View className="bg-ui-surface-light border border-ui-input-border rounded-[18px] overflow-hidden">
            {history.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/planes/plan/${item.plan_id}`)}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${
                  idx > 0 ? "border-t border-ui-input-border" : ""
                }`}
                style={({ hovered, pressed }) => ({
                  cursor: "pointer",
                  backgroundColor: hovered || pressed ? "rgba(15,13,32,0.025)" : "transparent",
                })}
              >
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: "rgba(48,35,205,0.07)",
                    borderWidth: 1,
                    borderColor: "rgba(48,35,205,0.12)",
                  }}
                >
                  <Calendar size={15} color={brandPrimary[600]} />
                </View>
                <View className="flex-1 gap-[3px]">
                  <Text numberOfLines={1} className="text-[13px] font-jakarta-bold text-ui-text-main tracking-tight">
                    {item.plan_name ?? "Plan eliminado"}
                  </Text>
                  <Text className="text-[10px] font-manrope-semi text-ui-text-muted">
                    {item.start_date}
                    {item.end_date ? ` → ${item.end_date}` : ""}
                    {"  ·  "}
                    {item.status === "dropped" ? "Abandonado" : "Completado"}
                  </Text>
                </View>
                <ChevronRight size={14} color="rgba(15,13,32,0.3)" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Tab: Catálogo ───────────────────────────────────────────────────────────
function CatalogoContent({ router }) {
  const { data: plans = [], isLoading } = useTrainingPlans({ publishedOnly: true });
  const [activeObjective, setActiveObjective] = useState(null);

  const availableObjectives = useMemo(() => {
    const seen = new Set();
    plans.forEach((p) => { if (p.objective) seen.add(p.objective); });
    return Array.from(seen);
  }, [plans]);

  const filteredPlans = useMemo(
    () => activeObjective ? plans.filter((p) => p.objective === activeObjective) : plans,
    [plans, activeObjective]
  );

  if (isLoading) {
    return (
      <View className="py-16 items-center">
        <Text className="text-xs font-manrope text-ui-text-muted">Cargando catálogo...</Text>
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View className="bg-ui-surface-light border border-ui-input-border rounded-[22px] px-9 py-14 items-center">
        <View className="w-14 h-14 rounded-[18px] bg-brandPrimary-50 items-center justify-center mb-5">
          <ClipboardList size={26} color={brandPrimary[600]} />
        </View>
        <Text className="text-base font-jakarta-bold text-ui-text-main tracking-tight mb-1.5">
          Sin planes disponibles
        </Text>
        <Text className="text-[13px] font-manrope text-ui-text-muted text-center leading-5 max-w-[320px]">
          El gym todavía no publicó planes de entrenamiento.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* ── Filtro por objetivo ── */}
      <View className="flex-row flex-wrap gap-2 mb-6">
        <ObjectiveChip
          label="Todos"
          active={activeObjective === null}
          onPress={() => setActiveObjective(null)}
        />
        {availableObjectives.map((obj) => {
          const cfg = OBJECTIVE_CONFIG[obj];
          if (!cfg) return null;
          return (
            <ObjectiveChip
              key={obj}
              label={cfg.label}
              Icon={cfg.Icon}
              active={activeObjective === obj}
              onPress={() => setActiveObjective(activeObjective === obj ? null : obj)}
            />
          );
        })}
      </View>

      {filteredPlans.length === 0 ? (
        <View className="bg-ui-surface-light border border-ui-input-border rounded-[22px] px-9 py-12 items-center">
          <Text className="text-sm font-jakarta-bold text-ui-text-main tracking-tight mb-1">
            Sin planes para este objetivo
          </Text>
          <Text className="text-[13px] font-manrope text-ui-text-muted text-center leading-5">
            Probá seleccionar otro objetivo o "Todos".
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-[18px]">
          {filteredPlans.map((plan, i) => (
            <View key={plan.id} style={{ flexBasis: "calc(50% - 9px)", minWidth: 320 }}>
              <PlanCardWeb
                plan={plan}
                index={i}
                onPress={(p) => router.push(`/planes/plan/${p.id}`)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Empty: sin plan actual ──────────────────────────────────────────────────
function EmptyCurrentPlan({ onBrowseCatalog }) {
  return (
    <View
      className="bg-ui-surface-light rounded-[22px] overflow-hidden p-7"
      style={{ borderWidth: 1, borderColor: "rgba(48,35,205,0.18)" }}
    >
      {/* Ticks firma */}
      <View className="absolute top-[18px] left-[22px] w-7 h-[3px] rounded-full bg-brandSecondary-400" />
      <View
        className="absolute top-[18px] left-[54px] w-2.5 h-[3px] rounded-full"
        style={{ backgroundColor: "rgba(42,232,204,0.35)" }}
      />

      <View className="flex-row items-center gap-3.5 pt-4 mb-3.5">
        <View
          className="w-12 h-12 rounded-[14px] items-center justify-center"
          style={{ backgroundColor: "rgba(48,35,205,0.1)" }}
        >
          <ClipboardList size={22} color={brandPrimary[600]} />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-manrope-bold uppercase tracking-[1.6px] text-brandSecondary-700 mb-1">
            Sin plan activo
          </Text>
          <Text className="text-lg font-jakarta-bold text-ui-text-main tracking-tight">
            Empezá a entrenar con estructura
          </Text>
        </View>
      </View>

      <Text className="text-[13px] font-manrope text-ui-text-muted leading-5 mb-5">
        Elegí un plan del catálogo publicado por el gym y empezá hoy mismo.
      </Text>

      <Pressable
        onPress={onBrowseCatalog}
        className="self-start flex-row items-center gap-2 px-3.5 py-2.5 rounded-xl bg-brandPrimary-600"
        style={({ hovered, pressed }) => ({
          cursor: "pointer",
          shadowColor: brandPrimary[600],
          shadowOpacity: hovered ? 0.4 : 0.25,
          shadowRadius: hovered ? 12 : 8,
          shadowOffset: { width: 0, height: 3 },
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text className="text-[11px] font-manrope-bold uppercase tracking-[1.4px] text-white">
          Explorar catálogo
        </Text>
        <ChevronRight size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── PlanCardWeb (Editorial Pass adaptado a fondo claro) ─────────────────────
function PlanCardWeb({ plan, index = 0, onPress }) {
  const config = OBJECTIVE_CONFIG[plan.objective] ?? DEFAULT_CONFIG;
  const { Icon } = config;

  const imageUrl = plan.cover_image_uri
    ? plan.cover_image_uri.startsWith("file://")
      ? plan.cover_image_uri
      : getCloudinaryUrl(plan.cover_image_uri, "w_500,h_500,c_fill,f_auto,q_auto")
    : null;

  const planNumber = String(index + 1).padStart(2, "0");

  return (
    <Pressable
      onPress={() => onPress?.(plan)}
      className="bg-ui-surface-light border border-ui-input-border rounded-[22px] overflow-hidden"
      style={({ hovered, pressed }) => ({
        cursor: "pointer",
        shadowColor: brandPrimary[700],
        shadowOpacity: hovered ? 0.14 : 0.07,
        shadowRadius: hovered ? 28 : 18,
        shadowOffset: { width: 0, height: hovered ? 12 : 8 },
        transform: pressed ? [{ scale: 0.995 }] : [],
      })}
    >
      {/* Glow indigo esquina inferior derecha */}
      <LinearGradient
        colors={["rgba(74,68,228,0)", "rgba(74,68,228,0.08)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", right: 0, bottom: 0, width: 260, height: 180 }}
      />

      {/* Número editorial de fondo */}
      <Text
        className="font-jakarta-bold absolute"
        style={{ top: -14, right: -6, fontSize: 140, lineHeight: 140, color: "rgba(15,13,32,0.04)", letterSpacing: -6 }}
      >
        {planNumber}
      </Text>

      {/* Ticks firma */}
      <View className="absolute top-[18px] left-5 w-7 h-[3px] rounded-full bg-brandSecondary-400" />
      <View
        className="absolute top-[18px] left-[52px] w-2.5 h-[3px] rounded-full"
        style={{ backgroundColor: "rgba(42,232,204,0.4)" }}
      />

      {/* Header: kicker + creador */}
      <View className="flex-row items-center justify-between px-[22px] pt-8 gap-3">
        <Text className="text-[10px] font-manrope-bold uppercase tracking-[2.4px] text-brandSecondary-700">
          El Programa
        </Text>
        {plan.creator && <CreatorChip creator={plan.creator} />}
      </View>

      {/* Body: título + imagen */}
      <View className="flex-row px-[22px] pt-4 pb-3.5 gap-4">
        <View className="flex-1 gap-2">
          {config.label && (
            <View className="flex-row items-center gap-1.5">
              <View className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgba(15,13,32,0.4)" }} />
              <Text className="text-[9px] font-manrope-bold uppercase tracking-[1.6px] text-ui-text-muted">
                {config.label}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={3}
            className="font-jakarta-bold text-ui-text-main"
            style={{ fontSize: 24, lineHeight: 28, letterSpacing: -0.7 }}
          >
            {plan.name}
          </Text>
        </View>

        {/* Imagen cuadrada contenida */}
        <View className="items-center gap-1.5">
          <View className="absolute left-[-10px] top-3 w-[3px] h-9 rounded-full bg-brandSecondary-400" />

          <View
            className="w-[110px] h-[110px] rounded-[18px] overflow-hidden bg-brandPrimary-50"
            style={{ borderWidth: 1, borderColor: "rgba(15,13,32,0.08)" }}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <>
                <LinearGradient
                  colors={BRAND_FALLBACK_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }}>
                  <Icon size={48} color="rgba(255,255,255,0.4)" />
                </View>
              </>
            )}
          </View>

          <View className="flex-row items-center gap-1">
            <View className="w-3 h-px" style={{ backgroundColor: "rgba(15,13,32,0.2)" }} />
            <Text className="text-[8px] font-manrope-bold uppercase tracking-[1.4px]" style={{ color: "rgba(15,13,32,0.4)" }}>
              Cover
            </Text>
            <View className="w-3 h-px" style={{ backgroundColor: "rgba(15,13,32,0.2)" }} />
          </View>
        </View>
      </View>

      {/* Stats strip */}
      <View className="flex-row items-end px-[22px] pt-1 pb-4 gap-[22px]">
        <PlanStat
          value={plan.weekly_days ?? 0}
          primaryLabel={plan.weekly_days === 1 ? "día" : "días"}
          secondaryLabel="por semana"
        />
        <View className="w-px h-7 mb-0.5" style={{ backgroundColor: "rgba(15,13,32,0.1)" }} />
        <PlanStat
          value={plan.duration_weeks ?? 0}
          primaryLabel={plan.duration_weeks === 1 ? "semana" : "semanas"}
          secondaryLabel="de duración"
        />
      </View>

      {/* CTA strip */}
      <View style={{ borderTopWidth: 1, borderTopColor: "rgba(15,13,32,0.06)" }}>
        <View className="flex-row items-center justify-between px-[22px] py-3.5">
          <View className="flex-row items-center gap-2">
            <View
              className="w-[22px] h-[22px] rounded-full items-center justify-center"
              style={{
                backgroundColor: "rgba(74,68,228,0.1)",
                borderWidth: 1,
                borderColor: "rgba(74,68,228,0.35)",
              }}
            >
              <View className="w-1.5 h-1.5 rounded-full bg-brandPrimary-600" />
            </View>
            <Text className="text-[11px] font-manrope-bold uppercase tracking-[1.5px] text-ui-text-main">
              Ver Plan Completo
            </Text>
          </View>

          <View
            className="w-[30px] h-[30px] rounded-full items-center justify-center bg-brandPrimary-600"
            style={{
              shadowColor: brandPrimary[600],
              shadowOpacity: 0.45,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <ChevronRight size={14} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Helpers UI ──────────────────────────────────────────────────────────────
function ObjectiveChip({ label, Icon, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full"
      style={({ hovered, pressed }) => ({
        cursor: "pointer",
        backgroundColor: active
          ? brandPrimary[600]
          : hovered || pressed
          ? "rgba(48,35,205,0.07)"
          : "rgba(15,13,32,0.04)",
        borderWidth: 1,
        borderColor: active ? "transparent" : "rgba(15,13,32,0.1)",
        shadowColor: active ? brandPrimary[600] : "transparent",
        shadowOpacity: active ? 0.3 : 0,
        shadowRadius: active ? 8 : 0,
        shadowOffset: { width: 0, height: 2 },
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {Icon && (
        <Icon size={13} color={active ? "#fff" : "rgba(15,13,32,0.45)"} />
      )}
      <Text
        className="text-[11px] font-manrope-bold uppercase tracking-[1.3px]"
        style={{ color: active ? "#fff" : "rgba(15,13,32,0.55)" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PlanStat({ value, primaryLabel, secondaryLabel }) {
  return (
    <View className="flex-row items-end gap-2">
      <Text className="font-jakarta-bold text-ui-text-main" style={{ fontSize: 30, lineHeight: 30, letterSpacing: -1.2 }}>
        {value}
      </Text>
      <View className="gap-[1px] pb-[3px]">
        <Text className="text-[9px] font-manrope-bold uppercase tracking-[1.6px] text-brandSecondary-700">
          {primaryLabel}
        </Text>
        <Text className="text-[9px] font-manrope-semi uppercase tracking-[1.4px] text-ui-text-muted">
          {secondaryLabel}
        </Text>
      </View>
    </View>
  );
}

function CreatorChip({ creator }) {
  const fullName    = [creator.name, creator.last_name].filter(Boolean).join(" ");
  const displayName = fullName.trim() || "—";
  const initial     = displayName.charAt(0).toUpperCase();
  const avatarUrl   = creator.image_profile
    ? creator.image_profile.startsWith("http")
      ? creator.image_profile
      : getCloudinaryUrl(creator.image_profile, "w_60,h_60,c_fill,f_auto,q_auto")
    : null;

  return (
    <View
      className="flex-row items-center gap-2 pl-1 pr-2.5 py-1 rounded-full max-w-[180px]"
      style={{ backgroundColor: "rgba(15,13,32,0.04)", borderWidth: 1, borderColor: "rgba(15,13,32,0.06)" }}
    >
      <View
        className="w-5 h-5 rounded-full overflow-hidden items-center justify-center"
        style={{ backgroundColor: "rgba(48,35,205,0.18)" }}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <Text className="text-[10px] font-jakarta-bold text-brandPrimary-700">{initial}</Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        className="text-[9px] font-manrope-bold uppercase tracking-[1.2px] text-ui-text-muted flex-shrink"
      >
        Por {displayName}
      </Text>
    </View>
  );
}
