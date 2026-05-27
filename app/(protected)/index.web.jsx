// React Native
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useMemo } from "react";

// Librerías
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// Auth
import { useAuth } from "../../src/auth/lib/getSession.jsx";
import { useUserRole } from "../../src/hooks/useUserRole.js";

// BD
import { supabase } from "../../src/database/supabase.js";

// Hooks
import { useSessionLogs } from "../../src/hooks/useSessionLogs.js";

// Utilidades
import { formatDuration } from "../../src/utils/format-date.js";

// Tema / assets
import { brandPrimary, brandSecondary, ui } from "../../src/theme/colors.js";
import {
  Barbell,
  ChevronRight,
  ClipboardList,
  Clock,
  Home,
  Logout,
  Logs,
  Plus,
} from "../../assets/icons.jsx";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const P600        = brandPrimary[600];   // #3023cd
const P700        = brandPrimary[700];   // #4a44e4
const MINT        = brandSecondary[400]; // #2ae8cc
const MINT_DARK   = brandSecondary[700]; // #005047
const BG          = ui.background.light; // #f8f9fc
const SURFACE     = ui.surface.light;    // #ffffff
const TEXT_MAIN   = ui.text.main;        // #0f0d20
const TEXT_MUTED  = ui.text.muted;       // #6e6b8a
const BORDER      = "rgba(196,190,230,0.25)";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAYS_ES   = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function formatDateLine(d) {
  return `${String(d.getDate()).padStart(2,"0")} ${MONTHS_ES[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}
function greetingFor(d) {
  const h = d.getHours();
  if (h < 6)  return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function relativeFromNow(iso, now = new Date()) {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1)   return "hace instantes";
  if (minutes < 60)  return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24)    return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7)      return `hace ${days} d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5)     return `hace ${weeks} sem`;
  const months = Math.round(days / 30);
  return `hace ${months} mes${months === 1 ? "" : "es"}`;
}

function resolveLogLabels(log) {
  if (log.plan_id && log.plan_name) {
    return {
      title: log.session_name ?? log.plan_name,
      kicker: `${log.plan_name}${
        log.week_number ? ` · SEM ${log.week_number}` : ""
      }${log.day_number ? ` D${log.day_number}` : ""}`,
    };
  }
  if (log.session_name) {
    return { title: log.session_name, kicker: "Registro manual" };
  }
  return { title: "Entrenamiento libre", kicker: "Registro manual" };
}

// ─── Gate ────────────────────────────────────────────────────────────────────
export default function HomeWeb() {
  const { isStaff, loading } = useUserRole();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG }}>
        <Text style={{ fontSize: 13, fontFamily: "Manrope_400Regular", color: TEXT_MUTED }}>
          Cargando sesión...
        </Text>
      </View>
    );
  }

  if (isStaff) return <Redirect href="/admin" />;

  return <MemberHomeWeb />;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ user, router }) {
  const handleLogout = async () => {
    if (typeof window !== "undefined" && window.confirm("¿Cerrar sesión?")) {
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    }
  };

  const email     = user?.email || "";
  const firstName = (user?.name ?? "").split(" ")[0] || "";
  const initial   = (user?.name?.[0] ?? email[0] ?? "A").toUpperCase();

  const NAV = [
    { label: "Inicio",   icon: Home,          path: "/" },
    { label: "Rutinas",  icon: ClipboardList, path: "/rutinas" },
  ];

  return (
    <View style={{
      position: "sticky", top: 0, zIndex: 100,
      backgroundColor: SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 28,
      height: 60,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
    }}>
      {/* Logo */}
      <Pressable onPress={() => router.push("/")} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginRight: 36, cursor: "pointer" }}>
        <LinearGradient
          colors={[P700, P600]}
          style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
        >
          <Barbell size={16} color="#fff" />
        </LinearGradient>
        <View>
          <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.3 }}>
            GymTrack
          </Text>
          <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Mi espacio
          </Text>
        </View>
      </Pressable>

      {/* Nav links */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.path === "/";
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              style={({ pressed, hovered }) => ({
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 99,
                backgroundColor: active
                  ? `rgba(48,35,205,0.08)`
                  : hovered || pressed
                    ? "rgba(15,13,32,0.04)"
                    : "transparent",
                cursor: "pointer",
              })}
            >
              <Icon size={14} color={active ? P600 : TEXT_MUTED} />
              <Text style={{
                fontSize: 13, fontFamily: active ? "Manrope_700Bold" : "Manrope_400Regular",
                color: active ? P600 : TEXT_MUTED,
              }}>
                {item.label}
              </Text>
              {active && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: MINT }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* User */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* Avatar + name */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LinearGradient
            colors={[P700, P600]}
            style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
          >
            {user?.image_profile
              ? <Image source={{ uri: user.image_profile }} style={{ width: 32, height: 32, borderRadius: 10 }} />
              : <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: "#fff" }}>{initial}</Text>
            }
          </LinearGradient>
          {!!firstName && (
            <Text style={{ fontSize: 13, fontFamily: "Manrope_600SemiBold", color: TEXT_MAIN }}>
              {firstName}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={{ width: 1, height: 22, backgroundColor: BORDER }} />

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={({ hovered, pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 5,
            paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 99,
            backgroundColor: hovered || pressed ? "rgba(239,68,68,0.08)" : "transparent",
            cursor: "pointer",
          })}
        >
          <Logout size={14} color="#ef4444" />
          <Text style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "#ef4444" }}>
            Salir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Home principal ───────────────────────────────────────────────────────────
function MemberHomeWeb() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: logs = [], isLoading: logsLoading } = useSessionLogs();

  const now       = useMemo(() => new Date(), []);
  const dateLine  = formatDateLine(now);
  const dayName   = DAYS_ES[now.getDay()];
  const greeting  = greetingFor(now);
  const firstName = (user?.name ?? "").split(" ")[0] || "Atleta";

  const { sessionsThisMonth, timeThisMonth, lastSessionLabel } = useMemo(() => {
    const month = now.getMonth();
    const year  = now.getFullYear();
    const monthly = logs.filter((l) => {
      const d = new Date(l.completed_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalSeconds = monthly.reduce(
      (acc, l) => acc + (l.duration_seconds ?? 0),
      0
    );
    return {
      sessionsThisMonth: monthly.length,
      timeThisMonth: totalSeconds,
      lastSessionLabel: logs[0] ? relativeFromNow(logs[0].completed_at, now) : null,
    };
  }, [logs, now]);

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  const STATS = [
    {
      label: "Sesiones este mes",
      value: logsLoading ? "—" : String(sessionsThisMonth),
      Icon: ClipboardList,
      dot: P600,
      bubble: "rgba(48,35,205,0.08)",
    },
    {
      label: "Tiempo total este mes",
      value: logsLoading ? "—" : formatDuration(timeThisMonth),
      Icon: Clock,
      dot: "#7c3aed",
      bubble: "rgba(124,58,237,0.08)",
    },
    {
      label: "Última sesión",
      value: logsLoading ? "—" : lastSessionLabel ?? "—",
      Icon: Logs,
      dot: MINT_DARK,
      bubble: "rgba(0,80,71,0.08)",
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Navbar user={user} router={router} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 1080 }}>

          {/* ── BANNER DE BIENVENIDA ──────────────────────────────────── */}
          <LinearGradient
            colors={["#2518b8", "#4a44e4", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 22, padding: 32, marginBottom: 22, overflow: "hidden" }}
          >
            {/* Círculos decorativos */}
            <View style={{ position: "absolute", right: -30, top: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.05)" }} />
            <View style={{ position: "absolute", right: 120, bottom: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.04)" }} />
            <View style={{ position: "absolute", right: 12, top: 12, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" }} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                {/* Ticks */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: MINT }} />
                  <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: "rgba(42,232,204,0.4)" }} />
                </View>

                {/* Kicker */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: MINT, shadowColor: MINT, shadowOpacity: 1, shadowRadius: 5 }} />
                  <Text style={{ fontSize: 10, fontFamily: "Manrope_600SemiBold", color: "rgba(255,255,255,0.55)", letterSpacing: 1.8, textTransform: "uppercase" }}>
                    {greeting}
                  </Text>
                </View>

                <Text style={{ fontSize: 36, fontFamily: "PlusJakartaSans_700Bold", color: "#fff", letterSpacing: -1.2, lineHeight: 42, marginBottom: 6 }}>
                  {firstName}.
                </Text>

                <Text style={{ fontSize: 13, fontFamily: "Manrope_400Regular", color: "rgba(255,255,255,0.5)" }}>
                  {dateLine} · {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                </Text>
              </View>

              {/* Icono decorativo */}
              <View style={{
                marginLeft: 32,
                width: 88, height: 88,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Barbell size={38} color="rgba(255,255,255,0.85)" />
                <Text style={{ fontSize: 8, fontFamily: "Manrope_600SemiBold", color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 }}>
                  Atleta
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── FILA DE STATS ────────────────────────────────────────── */}
          <View style={{ flexDirection: "row", gap: 14, marginBottom: 22 }}>
            {STATS.map((stat, i) => {
              const Icon = stat.Icon;
              return (
                <View key={i} style={{
                  flex: 1, backgroundColor: SURFACE, borderRadius: 18,
                  padding: 20, borderWidth: 1, borderColor: BORDER,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: stat.bubble, alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color={stat.dot} />
                    </View>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stat.dot, opacity: 0.35 }} />
                  </View>
                  <Text style={{ fontSize: 28, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.8 }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, marginTop: 3 }}>
                    {stat.label}
                  </Text>
                  <View style={{ height: 2, borderRadius: 1, marginTop: 14, width: "35%", backgroundColor: stat.dot, opacity: 0.25 }} />
                </View>
              );
            })}
          </View>

          {/* ── LAYOUT 2 COLUMNAS ────────────────────────────────────── */}
          <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>

            {/* Hero — Últimas sesiones */}
            <View style={{ flex: 1.6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  Últimas sesiones
                </Text>
                {logs.length > recentLogs.length && (
                  <Text style={{ fontSize: 10, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 1, textTransform: "uppercase" }}>
                    {recentLogs.length} de {logs.length}
                  </Text>
                )}
              </View>

              <View style={{
                borderRadius: 22, overflow: "hidden",
                backgroundColor: SURFACE,
                borderWidth: 1, borderColor: BORDER,
                shadowColor: P700,
                shadowOpacity: 0.08,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
              }}>
                {/* Ticks firma editorial */}
                <View style={{ position: "absolute", top: 18, left: 22, width: 28, height: 3, backgroundColor: MINT, borderRadius: 2 }} />
                <View style={{ position: "absolute", top: 18, left: 54, width: 10, height: 3, backgroundColor: "rgba(42,232,204,0.35)", borderRadius: 2 }} />

                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 32, paddingBottom: 18 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 2.4, textTransform: "uppercase" }}>
                    Entrenamientos recientes
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MINT, shadowColor: MINT, shadowOpacity: 0.8, shadowRadius: 6 }} />
                    <Text style={{ fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MUTED, letterSpacing: 2, textTransform: "uppercase" }}>
                      Historial
                    </Text>
                  </View>
                </View>

                {/* Body */}
                {logsLoading ? (
                  <View style={{ paddingHorizontal: 22, paddingVertical: 60, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Manrope_400Regular", color: TEXT_MUTED }}>
                      Cargando registros...
                    </Text>
                  </View>
                ) : recentLogs.length === 0 ? (
                  <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 32, alignItems: "flex-start", gap: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(15,13,32,0.25)" }} />
                      <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.6, textTransform: "uppercase" }}>
                        Sin registros aún
                      </Text>
                    </View>
                    <Text style={{ fontSize: 28, lineHeight: 33, letterSpacing: -1, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN }}>
                      Todavía no{"\n"}registraste entrenamientos.
                    </Text>
                    <Text style={{ fontSize: 13, lineHeight: 20, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, maxWidth: 380 }}>
                      Cuando termines una sesión en el móvil, vas a ver acá tu progreso reciente.
                    </Text>
                  </View>
                ) : (
                  <View>
                    {recentLogs.map((log, idx) => {
                      const { title, kicker } = resolveLogLabels(log);
                      const d = new Date(log.completed_at);
                      const dayNum = String(d.getDate()).padStart(2, "0");
                      const monthLabel = MONTHS_ES[d.getMonth()].toUpperCase();
                      const duration = formatDuration(log.duration_seconds);
                      return (
                        <Pressable
                          key={log.id}
                          onPress={() => router.push(`/registros/${log.id}`)}
                          style={({ hovered, pressed }) => ({
                            flexDirection: "row", alignItems: "center", gap: 16,
                            paddingHorizontal: 22, paddingVertical: 14,
                            borderTopWidth: idx === 0 ? 0 : 1,
                            borderTopColor: BORDER,
                            backgroundColor: hovered || pressed ? "rgba(15,13,32,0.025)" : "transparent",
                            cursor: "pointer",
                          })}
                        >
                          {/* Bloque fecha editorial */}
                          <View style={{
                            width: 54, alignItems: "center", paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: "rgba(48,35,205,0.05)",
                            borderWidth: 1, borderColor: "rgba(48,35,205,0.1)",
                          }}>
                            <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.5, lineHeight: 22 }}>
                              {dayNum}
                            </Text>
                            <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: TEXT_MUTED, letterSpacing: 1.4, marginTop: 2 }}>
                              {monthLabel}
                            </Text>
                          </View>

                          {/* Título + kicker */}
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 1.6, textTransform: "uppercase" }} numberOfLines={1}>
                              {kicker}
                            </Text>
                            <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.3 }} numberOfLines={1}>
                              {title}
                            </Text>
                          </View>

                          {/* Métricas */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.2 }}>
                                {duration}
                              </Text>
                              <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 1 }}>
                                Duración
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.2 }}>
                                {log.set_count}
                              </Text>
                              <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 1 }}>
                                Series
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.2 }}>
                                {log.exercise_count}
                              </Text>
                              <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 1 }}>
                                Ejercicios
                              </Text>
                            </View>
                            <ChevronRight size={16} color="rgba(15,13,32,0.35)" />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* CTA strip — solo si hay logs */}
                {recentLogs.length > 0 && (
                  <Pressable
                    onPress={() => router.push("/registros")}
                    style={({ hovered, pressed }) => ({
                      borderTopWidth: 1, borderTopColor: BORDER,
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      paddingHorizontal: 22, paddingVertical: 16,
                      backgroundColor: hovered || pressed ? "rgba(48,35,205,0.04)" : "transparent",
                      cursor: "pointer",
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(74,68,228,0.1)", borderWidth: 1, borderColor: "rgba(74,68,228,0.35)", alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: P600 }} />
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Manrope_700Bold", color: TEXT_MAIN, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Ver todos los registros
                      </Text>
                    </View>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: P600, alignItems: "center", justifyContent: "center", shadowColor: P600, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }}>
                      <ChevronRight size={15} color="white" />
                    </View>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Acceso rápido */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                Acceso Rápido
              </Text>

              <View style={{ gap: 10 }}>
                <QuickCard
                  kicker="Catálogo"
                  title="Explorar rutinas"
                  description="Planes y sesiones publicados por el gym."
                  icon={<ClipboardList size={18} color="#fff" />}
                  accentBg={P600}
                  iconBubble="rgba(48,35,205,0.09)"
                  iconBorder="rgba(48,35,205,0.28)"
                  variant="primary"
                  onPress={() => router.push("/rutinas")}
                />
                <QuickCard
                  kicker="Personalizado"
                  title="Crear mi rutina"
                  description="Armá tu propia rutina eligiendo ejercicios."
                  icon={<Plus size={18} color={MINT_DARK} />}
                  accentBg={P600}
                  iconBubble="rgba(0,80,71,0.09)"
                  iconBorder="rgba(0,80,71,0.28)"
                  variant="ghost"
                  onPress={() => router.push("/rutinas/builder")}
                />
              </View>

              {/* Tip card */}
              <View style={{
                marginTop: 14,
                backgroundColor: `rgba(48,35,205,0.05)`,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: `rgba(48,35,205,0.12)`,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: MINT }} />
                  <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: MINT_DARK, letterSpacing: 1.6, textTransform: "uppercase" }}>
                    Tip del día
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.2, marginBottom: 4 }}>
                  Consistencia ante todo.
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, lineHeight: 18 }}>
                  El entrenamiento más efectivo es el que hacés seguido, no el que hacés perfecto.
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ─── QuickCard ────────────────────────────────────────────────────────────────
function QuickCard({ kicker, title, description, icon, iconBubble, iconBorder, variant, onPress }) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        borderRadius: 16, overflow: "hidden",
        backgroundColor: isPrimary
          ? "rgba(48,35,205,0.07)"
          : hovered || pressed ? "rgba(15,13,32,0.025)" : SURFACE,
        borderWidth: 1,
        borderColor: isPrimary ? "rgba(48,35,205,0.22)" : BORDER,
        padding: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        opacity: pressed ? 0.9 : 1,
        cursor: "pointer",
        shadowColor: "#000",
        shadowOpacity: hovered && !pressed ? 0.04 : 0,
        shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      })}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 13,
        backgroundColor: isPrimary ? P600 : iconBubble,
        borderWidth: 1, borderColor: isPrimary ? "rgba(255,255,255,0.3)" : iconBorder,
        alignItems: "center", justifyContent: "center",
        shadowColor: isPrimary ? P600 : "transparent",
        shadowOpacity: isPrimary ? 0.4 : 0,
        shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontFamily: "Manrope_700Bold", color: isPrimary ? MINT_DARK : "rgba(15,13,32,0.38)", letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 2 }}>
          {kicker}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.2 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: "Manrope_400Regular", color: TEXT_MUTED, lineHeight: 16, marginTop: 1 }} numberOfLines={1}>
          {description}
        </Text>
      </View>
      <View style={{
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: isPrimary ? "#fff" : "rgba(15,13,32,0.04)",
        borderWidth: isPrimary ? 0 : 1, borderColor: "rgba(15,13,32,0.09)",
        alignItems: "center", justifyContent: "center",
      }}>
        <ChevronRight size={13} color={isPrimary ? P600 : "rgba(15,13,32,0.45)"} />
      </View>
    </Pressable>
  );
}
