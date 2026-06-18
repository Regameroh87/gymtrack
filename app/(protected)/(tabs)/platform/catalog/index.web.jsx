// Catálogo central (super_admin): shell con tabs Ejercicios / Sesiones / Planes.
// Cada sección escribe DIRECTO a Supabase (is_catalog=true, gym_id=null); los gyms con
// default_catalog lo reciben read-only por su pase de pull. Ver [[project_default_catalog]].
import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import CatalogExercisesSection from "./exercises-section.web";
import CatalogSessionsSection from "./sessions-section.web";
import CatalogPlansSection from "./plans-section.web";

import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { ui } from "../../../../../src/theme/colors";
import { Barbell, ListDetails, Calendar } from "../../../../../assets/icons";

const TABS = [
  { key: "exercises", label: "Ejercicios", icon: Barbell },
  { key: "sessions", label: "Sesiones", icon: ListDetails },
  { key: "plans", label: "Planes", icon: Calendar },
];

export default function CatalogAdminWeb() {
  const { brandPrimary } = useGymTheme();
  const [tab, setTab] = useState("exercises");

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-[11px] font-manrope-semi text-brandPrimary-600 tracking-[1.4px] uppercase mb-1">
          Plataforma
        </Text>
        <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
          Catálogo por default
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted mt-1">
          Contenido central read-only que cada gimnasio activa cuando lo
          necesita.
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 mb-7 border-b border-ui-input-light">
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.icon;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className="flex-row items-center gap-2 px-4 py-3"
              style={{
                cursor: "pointer",
                borderBottomWidth: 2,
                borderBottomColor: active ? brandPrimary[600] : "transparent",
                marginBottom: -1,
              }}
            >
              <Icon
                size={15}
                color={active ? brandPrimary[600] : ui.text.muted}
              />
              <Text
                className={`text-[13px] font-manrope-bold ${
                  active ? "text-brandPrimary-600" : "text-ui-text-muted"
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "exercises" && <CatalogExercisesSection />}
      {tab === "sessions" && <CatalogSessionsSection />}
      {tab === "plans" && <CatalogPlansSection />}
    </ScrollView>
  );
}
