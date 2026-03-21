import { View, TextInput, Text, ScrollView } from "react-native";
import { useForm } from "@tanstack/react-form";
import CustomSelect from "../../../src/components/CustomSelect";

export default function AddExercise() {
  const categories = [
    { label: "Fuerza", value: "fuerza" },
    { label: "Cardio", value: "cardio" },
    { label: "Flexibilidad", value: "flexibilidad" },
    { label: "Potencia", value: "potencia" },
  ];

  const muscleGroups = [
    { label: "Pecho", value: "pecho" },
    { label: "Espalda", value: "espalda" },
    { label: "Piernas", value: "piernas" },
    { label: "Hombros", value: "hombros" },
    { label: "Brazos", value: "brazos" },
    { label: "Core", value: "core" },
  ];

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      muscle_group: "",
    },
    onSubmit: (data) => {
      console.log(data);
    },
  });

  return (
    <ScrollView className="flex-1 p-4 bg-ui-background dark:bg-ui-backgroundDark">
      <View className="mb-6">
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend-light mb-2 uppercase tracking-wider">
          NOMBRE DEL EJERCICIO
        </Text>
        <form.Field name="name">
          {(field) => (
            <TextInput
              value={field.state.value}
              onChangeText={field.handleChange}
              placeholder="Ej: Press de Banca"
              placeholderTextColor="#64748b"
              className="dark:bg-ui-input-dark bg-ui-input-light border border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-lexend"
            />
          )}
        </form.Field>
      </View>
      <View className="flex-row w-full justify-center gap-2">
        <form.Field name="category">
          {(field) => (
            <CustomSelect
              label="CATEGORIA"
              options={categories}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="Seleccionar categoría..."
            />
          )}
        </form.Field>

        <form.Field name="muscle_group">
          {(field) => (
            <CustomSelect
              label="GRUPO MUSCULAR"
              options={muscleGroups}
              value={field.state.value}
              onChange={field.handleChange}
              placeholder="Seleccionar grupo..."
            />
          )}
        </form.Field>
      </View>
    </ScrollView>
  );
}
