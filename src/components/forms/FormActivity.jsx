import { Pressable, Text, View } from "react-native";

// Libraries
import * as Haptics from "expo-haptics";

// Components
import StyledTextInput from "./StyledTextInput";

// Constantes / Icons / Theme
import { ACTIVITY_COLORS } from "../../constants/activity-options";
import { Flame, ListDetails, CheckCircle } from "../../../assets/icons";
import { ui } from "../../theme/colors";

// Form de alta/edición de actividad. Recibe un form de @tanstack/react-form con
// los campos { name, description, price, color, is_active }. Sin imágenes ni
// sync local: el submit lo resuelve el caller con las mutaciones online.
export default function FormActivity({ form, submitLabel = "GUARDAR ACTIVIDAD" }) {
  return (
    <View className="gap-5">
      {/* Nombre */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value || typeof value !== "string") return undefined;
            const trimmed = value.trim();
            if (trimmed.length > 0 && trimmed.length < 3)
              return "Mínimo 3 caracteres";
            return undefined;
          },
          onSubmit: ({ value }) => {
            if (!value || !value.trim()) return "El nombre es requerido";
            return undefined;
          },
        }}
      >
        {(field) => (
          <View className="gap-1.5">
            <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Nombre
            </Text>
            <StyledTextInput
              value={field.state.value}
              onChangeText={field.handleChange}
              placeholder="Ej: Musculación, CrossFit, Yoga"
              icon={<Flame color={ui.text.mutedDark} />}
              error={field.state.meta.errors?.length > 0}
            />
            {field.state.meta.errors?.length > 0 && (
              <Text className="text-red-500 dark:text-red-400 text-xs font-manrope-medium px-1">
                {field.state.meta.errors[0]}
              </Text>
            )}
          </View>
        )}
      </form.Field>

      {/* Descripción */}
      <form.Field name="description">
        {(field) => (
          <View className="gap-1.5">
            <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Descripción
            </Text>
            <StyledTextInput
              value={field.state.value}
              onChangeText={field.handleChange}
              placeholder="Breve descripción (opcional)"
              icon={<ListDetails color={ui.text.mutedDark} />}
              multiline
              numberOfLines={3}
              style={{ minHeight: 88, textAlignVertical: "top" }}
            />
          </View>
        )}
      </form.Field>

      {/* Color */}
      <form.Field name="color">
        {(field) => (
          <View className="gap-2">
            <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Color
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {ACTIVITY_COLORS.map((c) => {
                const selected = field.state.value === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      field.handleChange(c);
                    }}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: c,
                      borderWidth: selected ? 3 : 0,
                      borderColor: "#ffffff",
                      transform: [{ scale: selected ? 1.1 : 1 }],
                    }}
                  >
                    {selected && <CheckCircle size={16} color="#ffffff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </form.Field>

      {/* Activa / inactiva */}
      <form.Field name="is_active">
        {(field) => {
          const active = field.state.value !== false;
          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                field.handleChange(!active);
              }}
              className="flex-row items-center justify-between bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border rounded-xl p-4"
            >
              <View className="flex-1 pr-3">
                <Text className="text-sm font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
                  Actividad activa
                </Text>
                <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                  Las inactivas no se ofrecen a los socios
                </Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full px-0.5 justify-center ${
                  active ? "bg-brandPrimary-600" : "bg-ui-input-border"
                }`}
              >
                <View
                  className="w-6 h-6 rounded-full bg-white"
                  style={{ transform: [{ translateX: active ? 20 : 0 }] }}
                />
              </View>
            </Pressable>
          );
        }}
      </form.Field>

      {/* Submit */}
      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Pressable
            disabled={!canSubmit || isSubmitting}
            onPress={form.handleSubmit}
            className={`flex-row justify-center items-center gap-2 rounded-2xl py-4 active:scale-95 ${
              canSubmit && !isSubmitting
                ? "bg-brandPrimary-600"
                : "bg-ui-input-light dark:bg-ui-input-dark"
            }`}
          >
            <Text
              className={`text-sm font-jakarta-bold tracking-wider ${
                canSubmit && !isSubmitting
                  ? "text-white"
                  : "text-ui-text-muted dark:text-ui-text-mutedDark"
              }`}
            >
              {isSubmitting ? "GUARDANDO..." : submitLabel}
            </Text>
          </Pressable>
        )}
      </form.Subscribe>
    </View>
  );
}
