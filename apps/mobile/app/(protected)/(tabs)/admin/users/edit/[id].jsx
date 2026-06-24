import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useMemberDetail } from "../../../../../../src/hooks/users/use-member-detail";
import { useUpdateMember } from "../../../../../../src/hooks/users/use-update-member";
import { useUserRole } from "../../../../../../src/hooks/shared/use-user-role";
import { canManageMemberData } from "../../../../../../src/constants/roles";
import { PROFILE_GENDERS } from "../../../../../../src/constants/gender-options";
import FormField from "../../../../../../src/components/forms/FormField";
import StyledTextInput from "../../../../../../src/components/forms/StyledTextInput";
import SubmitButton from "../../../../../../src/components/forms/SubmitButton";
import { Phone, IdBadge, MapPin } from "../../../../../../assets/icons";
import { ui } from "../../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../../src/contexts/gym-theme-context";

// Normaliza igual que crear-socio (name/last_name/address en minúsculas).
const norm = (s) => (s ? s.trim().toLowerCase() : null);

export default function EditMember() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, loading: roleLoading } = useUserRole();
  const { brandPrimary } = useGymTheme();
  const canManage = canManageMemberData(role); // editar datos = admin+
  const { data, isLoading } = useMemberDetail(id);
  const updateMutation = useUpdateMember(id);

  const [form, setForm] = useState({
    name: "",
    last_name: "",
    phone: "",
    document_number: "",
    address: "",
    gender: "",
  });

  // Precargar con los datos actuales del alumno una vez disponibles.
  useEffect(() => {
    if (data?.profile) {
      setForm({
        name: data.profile.name ?? "",
        last_name: data.profile.last_name ?? "",
        phone: data.profile.phone ?? "",
        document_number: data.profile.document_number ?? "",
        address: data.profile.address ?? "",
        gender: data.profile.gender ?? "",
      });
    }
  }, [data?.profile]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const onSubmit = () => {
    updateMutation.mutate(
      {
        name: norm(form.name),
        last_name: norm(form.last_name),
        phone: form.phone?.trim() || null,
        document_number: form.document_number?.trim() || null,
        address: norm(form.address),
        gender: form.gender || null,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: "success",
            text1: "Datos actualizados",
            position: "bottom",
          });
          router.back();
        },
        onError: (e) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Toast.show({
            type: "error",
            text1: "No se pudo guardar",
            text2: e?.message,
            position: "bottom",
          });
        },
      }
    );
  };

  // Editar datos es administrativo (admin+). El coach no accede ni por URL.
  if (roleLoading) return null;
  if (!canManage) return <Redirect href={`/admin/users/${id}`} />;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[600]} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: Platform.OS === "android" ? insets.top : 0,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark mb-6">
        Editar datos
      </Text>

      <View className="gap-y-4">
        <FormField label="NOMBRE(S)">
          <StyledTextInput
            placeholder="Ej: Juan Pablo"
            value={form.name}
            onChangeText={set("name")}
          />
        </FormField>

        <FormField label="APELLIDO(S)">
          <StyledTextInput
            placeholder="Ej: Pérez García"
            value={form.last_name}
            onChangeText={set("last_name")}
          />
        </FormField>

        <FormField label="TELÉFONO">
          <StyledTextInput
            placeholder="123456789"
            icon={<Phone color={ui.text.mutedDark} />}
            value={form.phone}
            onChangeText={set("phone")}
            keyboardType="numeric"
          />
        </FormField>

        <FormField label="N° DE DOCUMENTO">
          <StyledTextInput
            placeholder="12345678"
            icon={<IdBadge color={ui.text.mutedDark} />}
            value={form.document_number}
            onChangeText={set("document_number")}
            keyboardType="numeric"
          />
        </FormField>

        <FormField label="DIRECCIÓN">
          <StyledTextInput
            placeholder="Ej: Calle 123"
            icon={<MapPin color={ui.text.mutedDark} />}
            value={form.address}
            onChangeText={set("address")}
          />
        </FormField>

        <FormField label="GÉNERO (opcional)">
          <View className="flex-row flex-wrap gap-2">
            {PROFILE_GENDERS.map((g) => {
              const active = form.gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  onPress={() => set("gender")(active ? "" : g.value)}
                  className={`px-4 py-2 rounded-xl border ${
                    active
                      ? "bg-brandPrimary-600 border-brandPrimary-600"
                      : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-manrope-semi ${
                      active
                        ? "text-white"
                        : "text-ui-text-muted dark:text-ui-text-mutedDark"
                    }`}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
      </View>

      <View className="mt-10">
        <SubmitButton
          onPress={onSubmit}
          isLoading={updateMutation.isPending}
          title="Guardar cambios"
        />
      </View>
    </ScrollView>
  );
}
