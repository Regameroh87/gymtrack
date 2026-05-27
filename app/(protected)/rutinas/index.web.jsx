// React Native
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState, useMemo } from "react";

// Librerías
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// Auth / Hooks
import { useAuth } from "../../../src/auth/lib/getSession.jsx";
import { useTrainingPlans } from "../../../src/hooks/useTrainingPlans.js";
import { usePlanAssignments } from "../../../src/hooks/usePlanAssignments.js";
import { useDropPlan } from "../../../src/hooks/useAssignPlan.js";

// Utilidades
import { getCloudinaryUrl } from "../../../src/utils/cloudinary.js";

// Componentes
import MemberNavbar from "../../../src/components/web/MemberNavbar.jsx";

// Tema / assets
import { brandPrimary, brandSecondary, ui } from "../../../src/theme/colors.js";
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

// ─── Tokens ──────────────────────────────────────────────────────────────────
const P500       = brandPrimary[500];
const P600       = brandPrimary[600];
const P700       = brandPrimary[700];
const MINT       = brandSecondary[400];
const MINT_DARK  = brandSecondary[700];
const BG         = ui.background.light;
const SURFACE    = ui.surface.light;
const TEXT_MAIN  = ui.text.main;
const TEXT_MUTED = ui.text.muted;
const BORDER     = "rgba(196,190,230,0.25)";

const BRAND_FALLBACK_GRADIENT = ["#0C0B14", "#1e1b4b", "#3023cd"];

const OBJECTIVE_CONFIG = {
  hipertrofia:       { Icon: Barbell,     label: "Hipertrofia" },
  fuerza:            { Icon: Barbell,     label: "Fuerza" },
  perdida_grasa:     { Icon: ChartBar,    label: "Pérdida de grasa" },
  resistencia:       { Icon: Clock,       label: "Resistencia" },
  acondicionamiento: { Icon: Logs,        label: "Acondicionamiento" },
  rehabilitacion:    { Icon: ShieldHalf,  label: "Rehabilitación" },
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
    <View style={{ flex: 1, backgroundColor: BG }}>
      <MemberNavbar />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 1080 }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: MINT }} />
                <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: "rgba(42,232,204,0.4)" }} />
              </View>
              <Text style={{ fontSize: 10, fontFamily: "Manrope_700Bold", color: P600, letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 4 }}>
                Mi Entrenamiento
              </Text>
              <Text style={{ fontSize: 38, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -1.4, lineHeight: 42 }}>
                Rutinas
              </Text>
            </View>

            {activeTab === "mis_planes" && (
              <Pressable
                onPress={() => router.push("/rutinas/builder")}
                style={({ hovered, pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 8,
                  paddingHorizontal: 16, paddingVertical: 11,
                  borderRadius: 14,
                  backgroundColor: P600,
                  cursor: "pointer",
                  shadowColor: P600,
                  shadowOpacity: hovered ? 0.45 : 0.28,
                  shadowRadius: hovered ? 14 : 10,
                  shadowOffset: { width: 0, height: 4 },
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Plus size={13} color="#fff" />
                </View>
                <Text style={{ fontSize: 11, fontFamily: "Manrope_700Bold", color: "#fff", letterSpacing: 1.4, textTransform: "uppercase" }}>
                  Crear rutina
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Tabs ──────────────────────────────────────────────── */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            borderBottomWidth: 1, borderBottomColor: BORDER,
            marginBottom: 28,
          }}>
            {MAIN_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={({ hovered }) => ({
                    paddingHorizontal: 4, paddingVertical: 14,
                    marginRight: 26,
                    cursor: "pointer",
                    position: "relative",
                  })}
                >
                  <Text style={{
                    fontSize: 14,
                    fontFamily: active ? "PlusJakartaSans_700Bold" : "Manrope_600SemiBold",
                    color: active ? TEXT_MAIN : TEXT_MUTED,
                    letterSpacing: -0.2,
                  }}>
                    {tab.label}
                  </Text>
                  {active && (
                    <View style={{
                      position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5,
                      borderRadius: 99, backgroundColor: P600,
                    }} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── Contenido ─────────────────────────────────────────── */}
          {activeTab === "mis_planes"
            ? <MisPlanesContent router={router} onBrowseCatalog={() => setActiveTab("catalogo")} />
            : <CatalogoContent router={router} />
          }
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
      <View style={{ paddingVertical: 60, alignItems: "center" }}>
        <Text style={{ fontSize: 12, fontFamily: "Manrope_400Regular", color: TEXT_MUTED }}>
          Cargando planes...
        </Text>
      </View>
    );
  }

  const currentPlan = assignments?.currentPlan ?? null;
  const history     = assignments?.history ?? [];

  const planObj = currentPlan ? {
    id:              currentPlan.plan_id,
    name:            currentPlan.plan_name,
    cover_image_uri: currentPlan.plan_cover,
    objective:       currentPlan.plan_objective,
    level:           currentPlan.plan_level,
    weekly_days:     currentPlan.plan_weekly_days,
    duration_weeks:  currentPlan.plan_duration_weeks,
  } : null;

  const assignedByCoach = currentPlan && currentPlan.assigned_by !== userId;

  return (
    <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
      {/* ── Columna izquierda: plan actual ── */}
      <View style={{ flex: 1.6 }}>
        <Text style={{ fontSize: 10, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
          Plan actual
        </Text>

        {planObj ? (
          <>
            {assignedByCoach && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MINT, shadowColor: MINT, shadowOpacity: 0.8, shadowRadius: 5 }} />
                <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 1.6, textTransform: "uppercase" }}>
                  Asignado por tu entrenador
                </Text>
              </View>
            )}

            <PlanCardWeb
              plan={planObj}
              index={0}
              onPress={() => router.push(`/rutinas/plan/${currentPlan.plan_id}`)}
            />

            <Pressable
              disabled={isDropping}
              onPress={() => dropPlan({ assignmentId: currentPlan.id })}
              style={({ hovered, pressed }) => ({
                marginTop: 14, alignSelf: "center",
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 99,
                backgroundColor: hovered || pressed ? "rgba(239,68,68,0.08)" : "transparent",
                cursor: "pointer",
                opacity: isDropping ? 0.5 : 1,
              })}
            >
              <Text style={{ fontSize: 11, fontFamily: "Manrope_600SemiBold", color: "#ef4444", letterSpacing: 0.4 }}>
                {isDropping ? "Abandonando…" : "Abandonar este plan"}
              </Text>
            </Pressable>
          </>
        ) : (
          <EmptyCurrentPlan onBrowseCatalog={onBrowseCatalog} />
        )}
      </View>

      {/* ── Columna derecha: historial ── */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
          Historial
        </Text>

        {history.length === 0 ? (
          <View style={{
            backgroundColor: SURFACE, borderRadius: 18,
            borderWidth: 1, borderColor: BORDER,
            padding: 22,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(15,13,32,0.25)" }} />
              <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.6, textTransform: "uppercase" }}>
                Sin registros
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.3, marginBottom: 4 }}>
              Tu historial aparecerá acá
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, lineHeight: 18 }}>
              Cuando completes o abandones un plan, lo vas a ver listado.
            </Text>
          </View>
        ) : (
          <View style={{
            backgroundColor: SURFACE, borderRadius: 18, overflow: "hidden",
            borderWidth: 1, borderColor: BORDER,
          }}>
            {history.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/rutinas/plan/${item.plan_id}`)}
                style={({ hovered, pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: BORDER,
                  backgroundColor: hovered || pressed ? "rgba(15,13,32,0.025)" : "transparent",
                  cursor: "pointer",
                })}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 11,
                  backgroundColor: "rgba(48,35,205,0.07)",
                  borderWidth: 1, borderColor: "rgba(48,35,205,0.12)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Calendar size={15} color={P600} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.2 }}
                  >
                    {item.plan_name ?? "Plan eliminado"}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 0.6 }}>
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
  const { data: plans = [], isLoading } = useTrainingPlans();

  const totalDays = useMemo(
    () => plans.reduce((acc, p) => acc + (p.day_count || 0), 0),
    [plans]
  );

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 60, alignItems: "center" }}>
        <Text style={{ fontSize: 12, fontFamily: "Manrope_400Regular", color: TEXT_MUTED }}>
          Cargando catálogo...
        </Text>
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View style={{
        backgroundColor: SURFACE, borderRadius: 22,
        borderWidth: 1, borderColor: BORDER,
        paddingHorizontal: 36, paddingVertical: 56,
        alignItems: "center",
      }}>
        <View style={{
          width: 56, height: 56, borderRadius: 18,
          backgroundColor: "rgba(48,35,205,0.08)",
          alignItems: "center", justifyContent: "center",
          marginBottom: 18,
        }}>
          <ClipboardList size={26} color={P600} />
        </View>
        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.3, marginBottom: 6 }}>
          Sin planes disponibles
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, textAlign: "center", maxWidth: 320, lineHeight: 19 }}>
          El gym todavía no publicó planes de entrenamiento.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 24 }}>
        <StatTile
          value={plans.length}
          label={plans.length === 1 ? "Plan disponible" : "Planes disponibles"}
          accent={P600}
          bubble="rgba(48,35,205,0.08)"
        />
        <StatTile
          value={totalDays}
          label="Días de entrenamiento"
          accent={MINT_DARK}
          bubble="rgba(0,80,71,0.08)"
        />
      </View>

      {/* Grid 2 columnas */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
        {plans.map((plan, i) => (
          <View key={plan.id} style={{ flexBasis: "calc(50% - 9px)", minWidth: 320 }}>
            <PlanCardWeb
              plan={plan}
              index={i}
              onPress={(p) => router.push(`/rutinas/plan/${p.id}`)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Empty: sin plan actual ──────────────────────────────────────────────────
function EmptyCurrentPlan({ onBrowseCatalog }) {
  return (
    <View style={{
      borderRadius: 22, overflow: "hidden",
      backgroundColor: SURFACE,
      borderWidth: 1, borderColor: "rgba(48,35,205,0.18)",
      padding: 28,
    }}>
      {/* Ticks firma */}
      <View style={{ position: "absolute", top: 18, left: 22, width: 28, height: 3, backgroundColor: MINT, borderRadius: 2 }} />
      <View style={{ position: "absolute", top: 18, left: 54, width: 10, height: 3, backgroundColor: "rgba(42,232,204,0.35)", borderRadius: 2 }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 18, marginBottom: 14 }}>
        <View style={{
          width: 48, height: 48, borderRadius: 14,
          backgroundColor: "rgba(48,35,205,0.1)",
          alignItems: "center", justifyContent: "center",
        }}>
          <ClipboardList size={22} color={P600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 4 }}>
            Sin plan activo
          </Text>
          <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.4 }}>
            Empezá a entrenar con estructura
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, lineHeight: 20, marginBottom: 18 }}>
        Elegí un plan del catálogo publicado por el gym y empezá hoy mismo.
      </Text>

      <Pressable
        onPress={onBrowseCatalog}
        style={({ hovered, pressed }) => ({
          alignSelf: "flex-start",
          flexDirection: "row", alignItems: "center", gap: 8,
          paddingHorizontal: 14, paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: P600,
          cursor: "pointer",
          shadowColor: P600,
          shadowOpacity: hovered ? 0.4 : 0.25,
          shadowRadius: hovered ? 12 : 8,
          shadowOffset: { width: 0, height: 3 },
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ fontSize: 11, fontFamily: "Manrope_700Bold", color: "#fff", letterSpacing: 1.4, textTransform: "uppercase" }}>
          Explorar catálogo
        </Text>
        <ChevronRight size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── PlanCardWeb (Editorial Pass adaptado) ──────────────────────────────────
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
      style={({ hovered, pressed }) => ({
        borderRadius: 22, overflow: "hidden",
        backgroundColor: SURFACE,
        borderWidth: 1, borderColor: BORDER,
        shadowColor: P700,
        shadowOpacity: hovered ? 0.16 : 0.08,
        shadowRadius: hovered ? 28 : 20,
        shadowOffset: { width: 0, height: hovered ? 12 : 8 },
        transform: pressed ? [{ scale: 0.995 }] : [],
        cursor: "pointer",
      })}
    >
      {/* Glow indigo esquina inferior derecha */}
      <LinearGradient
        colors={["rgba(74,68,228,0)", "rgba(74,68,228,0.08)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", right: 0, bottom: 0, width: 260, height: 180 }}
      />

      {/* Número editorial gigante de fondo */}
      <Text style={{
        position: "absolute", top: -14, right: -6,
        fontSize: 140, lineHeight: 140,
        fontFamily: "PlusJakartaSans_700Bold",
        color: "rgba(15,13,32,0.04)",
        letterSpacing: -6,
      }}>
        {planNumber}
      </Text>

      {/* Ticks firma top-left */}
      <View style={{ position: "absolute", top: 18, left: 20, width: 28, height: 3, backgroundColor: MINT, borderRadius: 2 }} />
      <View style={{ position: "absolute", top: 18, left: 52, width: 10, height: 3, backgroundColor: "rgba(42,232,204,0.4)", borderRadius: 2 }} />

      {/* Header: kicker + creador */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 22, paddingTop: 32, gap: 12,
      }}>
        <Text style={{ fontSize: 10, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 2.4, textTransform: "uppercase" }}>
          El Programa
        </Text>
        {plan.creator && <CreatorChip creator={plan.creator} />}
      </View>

      {/* Body: título + imagen */}
      <View style={{
        flexDirection: "row",
        paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, gap: 16,
      }}>
        <View style={{ flex: 1, gap: 8 }}>
          {config.label && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(15,13,32,0.4)" }} />
              <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.6, textTransform: "uppercase" }}>
                {config.label}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={3}
            style={{ fontSize: 24, lineHeight: 28, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.7 }}
          >
            {plan.name}
          </Text>
        </View>

        {/* Imagen cuadrada contenida */}
        <View style={{ gap: 6, alignItems: "center" }}>
          <View style={{ position: "absolute", left: -10, top: 12, width: 3, height: 36, backgroundColor: MINT, borderRadius: 2 }} />

          <View style={{
            width: 110, height: 110, borderRadius: 18, overflow: "hidden",
            borderWidth: 1, borderColor: "rgba(15,13,32,0.08)",
            backgroundColor: "#f2f0fa",
          }}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
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

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 12, height: 1, backgroundColor: "rgba(15,13,32,0.2)" }} />
            <Text style={{ fontSize: 8, fontFamily: "Manrope_700Bold", color: "rgba(15,13,32,0.4)", letterSpacing: 1.4, textTransform: "uppercase" }}>
              Cover
            </Text>
            <View style={{ width: 12, height: 1, backgroundColor: "rgba(15,13,32,0.2)" }} />
          </View>
        </View>
      </View>

      {/* Stats strip */}
      <View style={{
        flexDirection: "row", alignItems: "flex-end",
        paddingHorizontal: 22, paddingTop: 4, paddingBottom: 16, gap: 22,
      }}>
        <PlanStat
          value={plan.weekly_days ?? 0}
          primaryLabel={plan.weekly_days === 1 ? "día" : "días"}
          secondaryLabel="por semana"
        />
        <View style={{ width: 1, height: 28, backgroundColor: "rgba(15,13,32,0.1)", marginBottom: 2 }} />
        <PlanStat
          value={plan.duration_weeks ?? 0}
          primaryLabel={plan.duration_weeks === 1 ? "semana" : "semanas"}
          secondaryLabel="de duración"
        />
      </View>

      {/* CTA strip */}
      <View style={{ borderTopWidth: 1, borderTopColor: "rgba(15,13,32,0.06)" }}>
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: 22, paddingVertical: 14,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: "rgba(74,68,228,0.1)",
              borderWidth: 1, borderColor: "rgba(74,68,228,0.35)",
              alignItems: "center", justifyContent: "center",
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: P600 }} />
            </View>
            <Text style={{ fontSize: 11, fontFamily: "Manrope_700Bold", color: TEXT_MAIN, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Ver Plan Completo
            </Text>
          </View>

          <View style={{
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: P600,
            alignItems: "center", justifyContent: "center",
            shadowColor: P600, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
          }}>
            <ChevronRight size={14} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Helpers UI ──────────────────────────────────────────────────────────────
function StatTile({ value, label, accent, bubble }) {
  return (
    <View style={{
      flex: 1, backgroundColor: SURFACE, borderRadius: 18,
      padding: 20, borderWidth: 1, borderColor: BORDER,
      overflow: "hidden",
    }}>
      <View style={{
        position: "absolute", top: -24, right: -24,
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: bubble,
      }} />
      <Text style={{ fontSize: 30, fontFamily: "PlusJakartaSans_700Bold", color: accent, letterSpacing: -0.8, lineHeight: 34 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function PlanStat({ value, primaryLabel, secondaryLabel }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <Text style={{ fontSize: 30, lineHeight: 30, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -1.2 }}>
        {value}
      </Text>
      <View style={{ gap: 1, paddingBottom: 3 }}>
        <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 1.6, textTransform: "uppercase" }}>
          {primaryLabel}
        </Text>
        <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 1.4, textTransform: "uppercase" }}>
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
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingLeft: 4, paddingRight: 10, paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(15,13,32,0.04)",
      borderWidth: 1, borderColor: "rgba(15,13,32,0.06)",
      maxWidth: 180,
    }}>
      <View style={{
        width: 20, height: 20, borderRadius: 10, overflow: "hidden",
        backgroundColor: "rgba(48,35,205,0.18)",
        alignItems: "center", justifyContent: "center",
      }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", color: P700 }}>
            {initial}
          </Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.2, textTransform: "uppercase", flexShrink: 1 }}
      >
        Por {displayName}
      </Text>
    </View>
  );
}
