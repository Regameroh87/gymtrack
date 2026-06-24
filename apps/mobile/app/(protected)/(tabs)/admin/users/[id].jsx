import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import Screen from "../../../../../src/components/Screen";
import { useMemberDetail } from "../../../../../src/hooks/users/use-member-detail";
import {
  useAssignablePlans,
  useAssignPlanToMember,
} from "../../../../../src/hooks/users/use-assign-plan-to-member";
import { useMemberSubscriptions } from "../../../../../src/hooks/activities/use-member-subscriptions";
import { paymentBadge } from "@gymtrack/core";
import { PLAN_GENDER_BADGES } from "../../../../../src/constants/gender-options";
import {
  useToggleMemberActive,
  useDeleteMember,
} from "../../../../../src/hooks/users/use-update-member";
import {
  ROLE_LABELS,
  isStaffRole,
  canManageMemberData,
  canDeleteMember,
} from "../../../../../src/constants/roles";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";
import { useUserRole } from "../../../../../src/hooks/shared/use-user-role";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import {
  formatShortDate,
  formatRelativeDay,
  formatDuration,
} from "@gymtrack/core/format-date";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import {
  Mail,
  Phone,
  IdBadge,
  MapPin,
  Barbell,
  ClipboardList,
  ChevronRight,
  Flame,
} from "../../../../../assets/icons";

const avatarUri = (raw) => getCloudinaryUrl(raw) ?? raw ?? null;

const safeDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : formatShortDate(d);
};

const freqText = (f) => (f == null ? "Libre" : `${f}x/sem`);

const priceText = (p) =>
  p == null ? "Sin precio" : `$${Number(p).toLocaleString("es-AR")}/mes`;

export default function MemberDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useUserRole();
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const canManage = canManageMemberData(role); // editar / dar de baja (admin+)
  const canDelete = canDeleteMember(role);     // eliminar permanente (owner+)
  const { data, isLoading, isError } = useMemberDetail(id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: plans, isLoading: plansLoading } = useAssignablePlans();
  const assignMutation = useAssignPlanToMember(id);
  const toggleActive = useToggleMemberActive(id);
  const deleteMember = useDeleteMember();

  // Actividades del socio: solo lectura. La gestión (alta/baja/pagos) vive
  // centralizada en la sección Contabilidad.
  const { data: subs, isLoading: subsLoading } = useMemberSubscriptions(id);

  const onDeleteMember = () => {
    if (!data?.profile?.user_id) return;
    const name = [data.profile.name, data.profile.last_name]
      .filter(Boolean)
      .join(" ");
    const message = `¿Eliminar permanentemente a ${
      name || "este socio"
    }? Esta acción no puede deshacerse.`;

    const doDelete = () =>
      deleteMember.mutate(
        { gymId, targetUserId: data.profile.user_id },
        {
          onError: (e) =>
            Toast.show({
              type: "error",
              text1: "No se pudo eliminar",
              text2: e?.message,
              position: "bottom",
            }),
        }
      );

    // RN Web no soporta Alert.alert con botones: usar el confirm del browser.
    if (Platform.OS === "web") {
      if (window.confirm(message)) doDelete();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("Eliminar socio", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: doDelete },
    ]);
  };

  const onToggleActive = (nextActive) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleActive.mutate(nextActive, {
      onSuccess: () =>
        Toast.show({
          type: "success",
          text1: nextActive ? "Alumno reactivado" : "Alumno dado de baja",
          position: "bottom",
        }),
      onError: (e) =>
        Toast.show({
          type: "error",
          text1: "No se pudo actualizar",
          text2: e?.message,
          position: "bottom",
        }),
    });
  };

  const assignPlan = (planId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // El gym_id de la asignación es el gym activo del staff (lo resuelve el
    // hook); el del perfil del alumno ya no es confiable con multi-gym.
    assignMutation.mutate(
      { planId },
      {
        onSuccess: () => {
          setPickerOpen(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: "success",
            text1: "Plan asignado",
            position: "bottom",
          });
        },
        onError: (e) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Toast.show({
            type: "error",
            text1: "No se pudo asignar",
            text2: e?.message,
            position: "bottom",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Screen safe={Platform.OS === "android"}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={brandPrimary[600]} />
        </View>
      </Screen>
    );
  }

  if (isError || !data?.profile) {
    return (
      <Screen safe={Platform.OS === "android"}>
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
            No se pudo cargar la información del alumno.
          </Text>
        </View>
      </Screen>
    );
  }

  const { profile, activePlan, history } = data;
  const fullName = [profile.name, profile.last_name].filter(Boolean).join(" ");
  const photo = avatarUri(profile.image_profile);
  const staff = isStaffRole(profile.role);

  return (
    <Screen safe={Platform.OS === "android"}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Encabezado del perfil ── */}
        <View className="items-center px-6 pb-6">
          {photo ? (
            <Image
              source={{ uri: photo }}
              className="w-20 h-20 rounded-3xl"
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="w-20 h-20 rounded-3xl items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
              <Text className="font-jakarta-semi text-2xl text-brandPrimary-600 dark:text-brandPrimary-400">
                {profile.name?.charAt(0)}
                {profile.last_name?.charAt(0)}
              </Text>
            </View>
          )}

          <Text className="mt-3 text-xl font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark text-center capitalize">
            {fullName || "Sin nombre"}
          </Text>

          <View
            className={`mt-2 px-2.5 py-1 rounded-full ${
              staff
                ? "bg-violet-100 dark:bg-violet-900/40"
                : "bg-brandPrimary-100 dark:bg-brandPrimary-900/40"
            }`}
          >
            <Text
              className={`text-[10px] font-jakarta-semi uppercase tracking-wider ${
                staff
                  ? "text-violet-600 dark:text-violet-300"
                  : "text-brandPrimary-600 dark:text-brandPrimary-300"
              }`}
            >
              {ROLE_LABELS[profile.role] ?? profile.role}
            </Text>
          </View>
        </View>

        {/* ── Aviso de baja ── */}
        {!profile.is_active && (
          <View className="mx-5 mb-5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30">
            <Text className="text-[13px] font-jakarta-semi text-red-500 text-center">
              Este alumno está dado de baja
            </Text>
          </View>
        )}

        {/* ── Datos de contacto ── */}
        <View className="mx-5 mb-5 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl overflow-hidden">
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={Phone} label="Teléfono" value={profile.phone} />
          <InfoRow
            icon={IdBadge}
            label="Documento"
            value={profile.document_number}
          />
          <InfoRow
            icon={MapPin}
            label="Dirección"
            value={profile.address}
            last
          />
        </View>

        {/* ── Plan activo ── */}
        <SectionTitle>Plan activo</SectionTitle>
        <View className="mx-5 mb-5">
          {activePlan?.plan ? (
            <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-4 flex-row items-center">
              <View className="w-11 h-11 rounded-xl items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950 mr-3">
                <Barbell size={20} color={brandPrimary[600]} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
                  numberOfLines={1}
                >
                  {activePlan.plan.name}
                </Text>
                <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                  {[
                    activePlan.plan.level,
                    activePlan.plan.weekly_days
                      ? `${activePlan.plan.weekly_days} días/sem`
                      : null,
                    activePlan.plan.duration_weeks
                      ? `${activePlan.plan.duration_weeks} sem`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>
                <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
                  Desde {safeDate(activePlan.start_date)}
                  {activePlan.is_custom ? " · Personalizado" : ""}
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-dashed border-ui-input-border rounded-2xl p-5 items-center">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                Este alumno no tiene un plan asignado.
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPickerOpen(true);
            }}
            className="mt-3 flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-brandPrimary-600 active:opacity-80"
          >
            <Barbell size={16} color="#fff" />
            <Text className="text-sm font-jakarta-semi text-white">
              {activePlan?.plan ? "Cambiar plan" : "Asignar plan"}
            </Text>
          </Pressable>
        </View>

        {/* ── Actividades (solo lectura; se gestionan en Contabilidad) ── */}
        {canManage && (
          <>
            <SectionTitle>Actividades</SectionTitle>
            <View className="mx-5 mb-5">
              {subsLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="small" color={brandPrimary[600]} />
                </View>
              ) : (subs?.active?.length ?? 0) === 0 ? (
                <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-dashed border-ui-input-border rounded-2xl p-5 items-center">
                  <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                    Este socio no está inscripto a ninguna actividad.
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {subs.active.map((sub) => {
                    const badge = paymentBadge(sub.due_date);
                    const color = sub.activities?.color ?? brandPrimary[600];
                    return (
                      <View
                        key={sub.id}
                        className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5"
                      >
                        <View className="flex-row items-center">
                          <View
                            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                            style={{ backgroundColor: `${color}1A` }}
                          >
                            <Flame size={20} color={color} />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
                              numberOfLines={1}
                            >
                              {sub.activities?.name ?? "Actividad"}
                            </Text>
                            <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                              {sub.activity_plans?.label ?? "Pase"} ·{" "}
                              {freqText(sub.activity_plans?.frequency_per_week)} ·{" "}
                              {priceText(sub.price)}
                            </Text>
                          </View>
                          <View className="items-end">
                            <View className={`px-2 py-0.5 rounded-md ${badge.chip}`}>
                              <Text
                                className={`text-[9px] font-manrope-bold tracking-wider uppercase ${badge.text}`}
                              >
                                {badge.label}
                              </Text>
                            </View>
                            <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
                              vence {safeDate(sub.due_date)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-3 text-center">
                Las membresías se gestionan desde Contabilidad.
              </Text>
            </View>
          </>
        )}

        {/* ── Historial de entrenamientos ── */}
        <SectionTitle>Historial</SectionTitle>
        <View className="mx-5">
          {history.length === 0 ? (
            <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-5 items-center">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                Todavía no registró entrenamientos.
              </Text>
            </View>
          ) : (
            history.map((log, i) => (
              <View
                key={log.id}
                className={`flex-row items-center py-3 ${
                  i === history.length - 1
                    ? ""
                    : "border-b border-ui-input-border"
                }`}
              >
                <View className="w-9 h-9 rounded-lg items-center justify-center bg-brandSecondary-500/10 mr-3">
                  <ClipboardList size={16} color={ui.text.muted} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[13px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
                    numberOfLines={1}
                  >
                    {log.session_name ?? "Entrenamiento"}
                  </Text>
                  <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                    {formatRelativeDay(log.completed_at)} ·{" "}
                    {formatDuration(log.duration_seconds)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Acciones administrativas (solo admin+) ── */}
        {canManage && (
          <View className="mx-5 mt-8 gap-2.5">
            <Pressable
              onPress={() => router.push(`/admin/users/edit/${id}`)}
              className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-80"
            >
              <Text className="text-sm font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark">
                Editar datos
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onToggleActive(!profile.is_active)}
              disabled={toggleActive.isPending}
              className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl border active:opacity-80 ${
                profile.is_active
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-green-500/30 bg-green-500/10"
              }`}
            >
              <Text
                className={`text-sm font-jakarta-semi ${
                  profile.is_active ? "text-red-500" : "text-green-600"
                }`}
              >
                {profile.is_active ? "Dar de baja" : "Reactivar alumno"}
              </Text>
            </Pressable>

            {canDelete && (
              <Pressable
                onPress={onDeleteMember}
                disabled={deleteMember.isPending}
                className="flex-row items-center justify-center gap-2 py-3 rounded-2xl bg-red-500 active:opacity-80"
              >
                <Text className="text-sm font-jakarta-semi text-white">
                  Eliminar definitivamente
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Selector de plan ── */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            className="bg-ui-background-light dark:bg-ui-background-dark rounded-t-3xl max-h-[75%]"
            style={{ paddingBottom: insets.bottom + 12 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-ui-input-border" />
            </View>
            <Text className="px-6 pt-2 pb-3 text-lg font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark">
              Asignar plan
            </Text>

            {plansLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator color={brandPrimary[600]} />
              </View>
            ) : !plans?.length ? (
              <View className="py-12 px-10 items-center">
                <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                  No hay planes publicados para asignar.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {plans.map((p) => {
                  const isActive = activePlan?.plan_id === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      disabled={assignMutation.isPending || isActive}
                      onPress={() => assignPlan(p.id)}
                      className={`mx-5 mb-2.5 flex-row items-center p-3.5 rounded-2xl border ${
                        isActive
                          ? "border-brandPrimary-500 bg-brandPrimary-50 dark:bg-brandPrimary-950"
                          : "border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark"
                      } active:opacity-80`}
                    >
                      <View className="w-10 h-10 rounded-xl items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950 mr-3">
                        <Barbell size={18} color={brandPrimary[600]} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                          {[
                            p.level,
                            PLAN_GENDER_BADGES[p.target_gender],
                            p.weekly_days ? `${p.weekly_days} días/sem` : null,
                            p.duration_weeks ? `${p.duration_weeks} sem` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </Text>
                      </View>
                      {isActive ? (
                        <Text className="text-[10px] font-jakarta-semi uppercase tracking-wider text-brandPrimary-600 dark:text-brandPrimary-400">
                          Activo
                        </Text>
                      ) : (
                        <ChevronRight size={16} color={ui.text.muted} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

    </Screen>
  );
}

// ── Subcomponentes ──

function SectionTitle({ children }) {
  return (
    <Text className="px-6 mb-2.5 text-xs font-jakarta-semi uppercase tracking-widest text-brandPrimary-500 dark:text-brandPrimary-400">
      {children}
    </Text>
  );
}

function InfoRow({ icon: Icon, label, value, last }) {
  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        last ? "" : "border-b border-ui-input-border"
      }`}
    >
      <Icon size={15} color={ui.text.muted} />
      <Text className="ml-3 text-[11px] font-manrope-semi uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark w-20">
        {label}
      </Text>
      <Text
        className="flex-1 text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark text-right"
        numberOfLines={1}
      >
        {value || "—"}
      </Text>
    </View>
  );
}
